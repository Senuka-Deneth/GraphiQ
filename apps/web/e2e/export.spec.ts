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
