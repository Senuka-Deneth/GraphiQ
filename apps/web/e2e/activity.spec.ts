import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";
import { openDslPanel } from "./helpers.js";

const fixtureDir = dirname(fileURLToPath(import.meta.url));
const fulfillOrderFixture = readFileSync(
  join(fixtureDir, "../../../packages/uml-dsl/src/fixtures/activity-fulfill-order.dsl"),
  "utf8",
);

const incomingInitialFixture = `diagram activity IncomingInitial

action ReceiveOrder
initial --> ReceiveOrder
ReceiveOrder --> initial
`;

test("activity document renders partitions and actions from the section 5.9 fixture", async ({
  page,
}) => {
  await page.goto("/");
  await openDslPanel(page);

  await page.locator('[data-testid="new-document-kind"]').selectOption("activity");
  await expect(page.locator('[data-testid="document-kind-badge"]')).toHaveText("activity");

  const editor = page.locator('[data-testid="dsl-editor"]');
  await editor.click();
  await editor.fill(fulfillOrderFixture);

  await expect(page.locator('[data-testid="activity-canvas"]')).toBeVisible({
    timeout: 10_000,
  });
  await expect(page.locator('[data-testid="partition-name"]')).toHaveCount(2);
  await expect(page.getByTestId("partition-name").filter({ hasText: "Sales" })).toBeVisible();
  await expect(page.getByTestId("partition-name").filter({ hasText: "Warehouse" })).toBeVisible();
  await expect(page.locator('[data-testid="action-name"]')).toHaveCount(3);
  await expect(page.locator(".react-flow__edge")).toHaveCount(4);
});

test("incoming flow to initial shows act.initial-no-incoming", async ({ page }) => {
  await page.goto("/");
  await openDslPanel(page);

  await page.locator('[data-testid="new-document-kind"]').selectOption("activity");
  const editor = page.locator('[data-testid="dsl-editor"]');
  await editor.click();
  await editor.fill(incomingInitialFixture);

  await expect(page.locator('[data-testid="diagnostics-list"]')).toContainText(
    "act.initial-no-incoming",
    { timeout: 10_000 },
  );
});
