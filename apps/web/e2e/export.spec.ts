import { expect, test, type Page } from "@playwright/test";
import { openDslPanel } from "./helpers.js";
import { readFileSync } from "node:fs";

const CLASS_GENERALIZATION_DSL = `diagram class ExportE2E

class Alpha {
}

class Beta {
}

Alpha --|> Beta
`;

function pngSize(bytes: Buffer): { width: number; height: number } {
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

async function pngCornerAlpha(page: Page, png: Buffer): Promise<number> {
  return page.evaluate(async (b64) => {
    const image = new Image();
    image.src = `data:image/png;base64,${b64}`;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    const context = canvas.getContext("2d");
    if (context === null) {
      throw new Error("Canvas 2D context unavailable");
    }
    context.drawImage(image, 0, 0, 1, 1, 0, 0, 1, 1);
    return context.getImageData(0, 0, 1, 1).data[3] ?? -1;
  }, png.toString("base64"));
}

async function waitForDownloadReady(page: Page): Promise<void> {
  await expect(page.locator('[data-testid="export-download"]')).toBeEnabled();
  await expect(page.locator('[data-testid="export-download"]')).toHaveText("Download");
}

async function downloadExport(page: Page): Promise<Buffer> {
  await waitForDownloadReady(page);
  const pending = page.waitForEvent("download", { timeout: 60_000 });
  await page.locator('[data-testid="export-download"]').click();
  const file = await pending;
  const path = await file.path();
  expect(path).not.toBeNull();
  if (path === null) {
    throw new Error("expected download path");
  }
  const contents = readFileSync(path);
  await waitForDownloadReady(page);
  return contents;
}

async function openExportPreview(page: Page): Promise<void> {
  await page.goto("/");
  await openDslPanel(page);
  await expect(page.locator('[data-testid="persist-state"][data-value="saved"]')).toBeAttached({
    timeout: 10_000,
  });

  const editor = page.locator('[data-testid="dsl-editor"]');
  await editor.click();
  await editor.fill(CLASS_GENERALIZATION_DSL);
  await expect(page.locator(".react-flow__node")).toHaveCount(2, { timeout: 10_000 });

  await page.locator('[data-testid="open-export"]').click();
  await expect(page.locator('[data-testid="export-page"]')).toBeVisible();
  await expect(page.locator('[data-testid="export-capture-root"]')).toContainText("Alpha");
  await expect(page.locator('[data-testid="export-capture-root"]')).toContainText("Beta");
  await expect(page.locator('[data-testid="export-capture-root"] .react-flow__node')).toHaveCount(2, {
    timeout: 10_000,
  });
}

test("export page downloads live PNG SVG and PDF", async ({ page }) => {
  test.setTimeout(120_000);
  await openExportPreview(page);

  const pngContents = await downloadExport(page);
  expect(pngContents.subarray(0, 8)).toEqual(
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  );
  expect(pngContents.byteLength).toBeGreaterThan(1000);

  await page.locator('[data-testid="export-format-svg"]').click();
  const svgContents = (await downloadExport(page)).toString("utf8");
  expect(svgContents).toContain("Alpha");
  expect(svgContents).toContain("Beta");
  expect(svgContents).toContain("gen-hollow-triangle");

  await page.locator('[data-testid="export-format-pdf"]').click();
  const pdfContents = await downloadExport(page);
  expect(pdfContents.subarray(0, 5).toString()).toBe("%PDF-");
  expect(pdfContents.byteLength).toBeGreaterThan(100);
});

test("export crop page size and page fill change the file", async ({ page }) => {
  test.setTimeout(120_000);
  await openExportPreview(page);

  const cropSheet = page.locator('[data-testid="export-preview-sheet"]');
  const cropWidth = await cropSheet.getAttribute("data-sheet-width");
  const cropHeight = await cropSheet.getAttribute("data-sheet-height");
  expect(cropWidth).not.toBeNull();
  expect(cropHeight).not.toBeNull();

  const cropPng = await downloadExport(page);
  const cropSize = pngSize(cropPng);
  expect(cropSize.width).toBeGreaterThan(1);
  expect(cropSize.height).toBeGreaterThan(1);
  const fillOnAlpha = await pngCornerAlpha(page, cropPng);
  expect(fillOnAlpha).toBe(255);

  await page.locator('[data-testid="export-content-fullCanvas"]').click();
  const fullSheet = page.locator('[data-testid="export-preview-sheet"]');
  await expect(fullSheet).not.toHaveAttribute("data-sheet-width", cropWidth ?? "");
  const fullPng = await downloadExport(page);
  const fullSize = pngSize(fullPng);
  expect(fullSize.width * fullSize.height).not.toBe(cropSize.width * cropSize.height);

  await page.locator('[data-testid="export-content-cropToContent"]').click();
  await page.locator('[data-testid="export-page-fill"]').click();
  await expect(page.locator('[data-testid="export-page-fill"]')).toHaveAttribute(
    "aria-checked",
    "false",
  );
  const transparentPng = await downloadExport(page);
  const fillOffAlpha = await pngCornerAlpha(page, transparentPng);
  expect(fillOffAlpha).toBe(0);

  await page.locator('[data-testid="export-content-customCrop"]').click();
  await expect(page.locator('[data-testid="export-crop-overlay"]')).toBeVisible();

  await page.locator('[data-testid="export-page-size"]').click();
  await expect(page.locator('[data-testid="export-paper-size"]')).toBeVisible();
  await expect(page.locator('[data-testid="export-orientation"]')).toBeVisible();
  await page.locator('[data-testid="export-format-pdf"]').click();
  const pagedPdf = await downloadExport(page);
  expect(pagedPdf.subarray(0, 5).toString()).toBe("%PDF-");
  expect(pagedPdf.toString("latin1")).toMatch(/MediaBox/);
  expect(pagedPdf.toString("latin1")).toMatch(/595\.?/);
});
