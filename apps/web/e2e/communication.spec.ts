import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";

const fixtureDir = dirname(fileURLToPath(import.meta.url));
const checkoutFixture = readFileSync(
  join(fixtureDir, "../../../packages/uml-dsl/src/fixtures/communication-checkout.dsl"),
  "utf8",
);

const duplicateNumberFixture = `diagram communication Duplicate

instance customer: Customer
instance shop: Shop

customer -> shop : 1: placeOrder()
shop -> customer : 1: duplicate()
`;

test("communication document renders instances and numbered message labels", async ({ page }) => {
  await page.goto("/");

  await page.locator('[data-testid="new-document-kind"]').selectOption("communication");
  await expect(page.locator('[data-testid="document-kind-badge"]')).toHaveText("communication");

  const editor = page.locator('[data-testid="dsl-editor"]');
  await editor.click();
  await editor.fill(checkoutFixture);

  await expect(page.locator('[data-testid="communication-canvas"]')).toBeVisible({
    timeout: 10_000,
  });
  await expect(page.locator('[data-testid="instance-name"]')).toHaveCount(2);
  await expect(page.getByText("1: placeOrder()")).toBeVisible();
  await expect(page.getByText("2: confirm()")).toBeVisible();
  await expect(page.locator(".react-flow__edge")).toHaveCount(2);
});

test("duplicate sequence numbers show comm.number-unique-in-interaction", async ({ page }) => {
  await page.goto("/");

  await page.locator('[data-testid="new-document-kind"]').selectOption("communication");
  const editor = page.locator('[data-testid="dsl-editor"]');
  await editor.click();
  await editor.fill(duplicateNumberFixture);

  await expect(page.locator('[data-testid="diagnostics-list"]')).toContainText(
    "comm.number-unique-in-interaction",
    { timeout: 10_000 },
  );
});
