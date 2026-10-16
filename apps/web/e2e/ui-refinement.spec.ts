import { expect, test } from "@playwright/test";
import { waitForPersistReady } from "./helpers.js";

test("brand is visible before the application bundle loads", async ({ page }) => {
  await page.route("**/src/main.tsx*", route => route.abort());
  await page.goto("/");
  await expect(page.getByRole("status", { name: "Loading GraphiQ" })).toBeVisible();
  await expect(page.getByText("GraphiQ")).toBeVisible();
});

test("export fits its stage and capture geometry stays fixed when zooming", async ({ page }) => {
  await page.goto("/");
  await waitForPersistReady(page);
  await page.getByTestId("open-export").click();
  await page.getByTestId("export-page-size").click();
  const sheet = page.getByTestId("export-preview-sheet");
  const stage = page.getByTestId("export-stage");
  await expect.poll(async () => {
    const a = await sheet.boundingBox();
    const b = await stage.boundingBox();
    return !!a && !!b && a.x >= b.x && a.y >= b.y && a.x + a.width <= b.x + b.width && a.y + a.height <= b.y + b.height;
  }).toBe(true);
  const capture = page.getByTestId("export-capture-root");
  const size = await capture.evaluate(el => [el.clientWidth, el.clientHeight]);
  await page.getByTestId("export-preview-zoom-in").click();
  expect(await capture.evaluate(el => [el.clientWidth, el.clientHeight])).toEqual(size);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByTestId("export-orientation").scrollIntoViewIfNeeded();
  await expect(page.getByTestId("export-orientation")).toBeVisible();
  const options = await page.getByTestId("export-options").boundingBox();
  const orientation = await page.getByTestId("export-orientation").boundingBox();
  expect(orientation!.x + orientation!.width).toBeLessThanOrEqual(options!.x + options!.width);
});
