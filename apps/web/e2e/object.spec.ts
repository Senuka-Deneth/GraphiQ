import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";

const fixtureDir = dirname(fileURLToPath(import.meta.url));
const checkoutFixture = readFileSync(
  join(fixtureDir, "../../../packages/uml-dsl/src/fixtures/object-checkout.dsl"),
  "utf8",
);

test("object document renders underlined instance names from DSL", async ({ page }) => {
  await page.goto("/");

  await page.locator('[data-testid="new-document-kind"]').selectOption("object");
  await expect(page.locator('[data-testid="document-kind-badge"]')).toHaveText("object");

  const editor = page.locator('[data-testid="dsl-editor"]');
  await editor.click();
  await editor.fill(checkoutFixture);

  await expect(page.locator('[data-testid="object-canvas"]')).toBeVisible({
    timeout: 10_000,
  });
  await expect(page.locator('[data-testid="instance-name"]').first()).toBeVisible();
  await expect(page.locator('[data-testid="instance-name"]').first()).toHaveCSS(
    "text-decoration-line",
    "underline",
  );
  await expect(page.locator(".react-flow__node")).toHaveCount(2);
});
