import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";

const fixtureDir = dirname(fileURLToPath(import.meta.url));
const orderFlowFixture = readFileSync(
  join(fixtureDir, "../../../packages/uml-dsl/src/fixtures/interaction-overview-order-flow.dsl"),
  "utf8",
);

const messageFixture = `diagram interactionOverview Bad

A -> B : hello
`;

test("interaction overview document layouts the section 5.14 fixture as a directed activity", async ({
  page,
}) => {
  await page.goto("/");

  await page.locator('[data-testid="new-document-kind"]').selectOption("interactionOverview");
  await expect(page.locator('[data-testid="document-kind-badge"]')).toHaveText(
    "interactionOverview",
  );

  const editor = page.locator('[data-testid="dsl-editor"]');
  await editor.click();
  await editor.fill(orderFlowFixture);

  await expect(page.locator('[data-testid="interaction-overview-canvas"]')).toBeVisible({
    timeout: 10_000,
  });
  await expect(page.getByTestId("interaction-use-name").filter({ hasText: "Checkout" })).toBeVisible();
  await expect(page.getByTestId("interaction-use-name").filter({ hasText: "Fulfill" })).toBeVisible();
  await expect(page.locator('[data-testid="control-initialNode"]')).toBeVisible();
  await expect(page.locator('[data-testid="control-activityFinalNode"]')).toBeVisible();
  await expect(page.locator(".react-flow__edge")).toHaveCount(3);

  const initialY = await page.locator('[data-testid="control-initialNode"]').evaluate((element) => {
    return element.getBoundingClientRect().y;
  });
  const checkoutY = await page
    .getByTestId("interaction-use-name")
    .filter({ hasText: "Checkout" })
    .evaluate((element) => element.getBoundingClientRect().y);
  const fulfillY = await page
    .getByTestId("interaction-use-name")
    .filter({ hasText: "Fulfill" })
    .evaluate((element) => element.getBoundingClientRect().y);
  const finalY = await page
    .locator('[data-testid="control-activityFinalNode"]')
    .evaluate((element) => element.getBoundingClientRect().y);

  expect(checkoutY).toBeGreaterThan(initialY);
  expect(fulfillY).toBeGreaterThan(checkoutY);
  expect(finalY).toBeGreaterThan(fulfillY);
});

test("sequence-style messages are not accepted at the overview top level", async ({ page }) => {
  await page.goto("/");

  await page.locator('[data-testid="new-document-kind"]').selectOption("interactionOverview");
  const editor = page.locator('[data-testid="dsl-editor"]');
  await editor.click();
  await editor.fill(messageFixture);

  await expect(page.locator('[data-testid="diagnostics-list"]')).toContainText("dsl.parse", {
    timeout: 10_000,
  });
  await expect(page.locator(".react-flow__edge")).toHaveCount(0);
});
