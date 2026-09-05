import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";

const CLASS_GENERALIZATION_DSL = `diagram class ExportE2E

class Alpha {
}

class Beta {
}

Alpha --|> Beta
`;

test("export SVG and PNG include diagram content", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('[data-testid="persist-state"][data-value="saved"]')).toBeAttached({
    timeout: 10_000,
  });

  const editor = page.locator('[data-testid="dsl-editor"]');
  await editor.click();
  await editor.fill(CLASS_GENERALIZATION_DSL);
  await expect(page.locator(".react-flow__node")).toHaveCount(2, { timeout: 10_000 });

  const svgDownload = page.waitForEvent("download");
  await page.locator('[data-testid="export-svg"]').click();
  const svgFile = await svgDownload;
  const svgPath = await svgFile.path();
  expect(svgPath).not.toBeNull();
  if (svgPath === null) {
    throw new Error("expected svg download path");
  }
  const svgContents = readFileSync(svgPath, "utf8");
  expect(svgContents).toContain("Alpha");
  expect(svgContents).toContain("Beta");
  expect(svgContents).toContain("gen-hollow-triangle");

  const pngDownload = page.waitForEvent("download");
  await page.locator('[data-testid="export-png"]').click();
  const pngFile = await pngDownload;
  const pngPath = await pngFile.path();
  expect(pngPath).not.toBeNull();
  if (pngPath === null) {
    throw new Error("expected png download path");
  }
  const pngContents = readFileSync(pngPath);
  expect(pngContents.byteLength).toBeGreaterThan(0);
});
