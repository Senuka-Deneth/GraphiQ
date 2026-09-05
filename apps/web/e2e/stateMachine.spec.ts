import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";
import { openDslPanel } from "./helpers.js";

const fixtureDir = dirname(fileURLToPath(import.meta.url));
const orderLifecycleFixture = readFileSync(
  join(fixtureDir, "../../../packages/uml-dsl/src/fixtures/state-machine-order-lifecycle.dsl"),
  "utf8",
);

const initialWithTriggerFixture = `diagram stateMachine InitialWithTrigger

[*] --> Draft : start
Draft --> Paid
`;

test("state machine document renders states and transitions from the section 5.10 fixture", async ({
  page,
}) => {
  await page.goto("/");
  await openDslPanel(page);

  await page.locator('[data-testid="new-document-kind"]').selectOption("stateMachine");
  await expect(page.locator('[data-testid="document-kind-badge"]')).toHaveText("stateMachine");

  const editor = page.locator('[data-testid="dsl-editor"]');
  await editor.click();
  await editor.fill(orderLifecycleFixture);

  await expect(page.locator('[data-testid="state-machine-canvas"]')).toBeVisible({
    timeout: 10_000,
  });
  await expect(page.getByTestId("state-name").filter({ hasText: "Draft" })).toBeVisible();
  await expect(page.getByTestId("state-name").filter({ hasText: "Paid" })).toBeVisible();
  await expect(page.locator(".react-flow__edge")).toHaveCount(3);
  await expect(
    page.locator('[data-testid="state-machine-canvas"]').getByText("pay [amount > 0] / emitReceipt"),
  ).toBeVisible();
});

test("initial with trigger shows sm.initial-one-outgoing-no-trigger", async ({ page }) => {
  await page.goto("/");
  await openDslPanel(page);

  await page.locator('[data-testid="new-document-kind"]').selectOption("stateMachine");
  const editor = page.locator('[data-testid="dsl-editor"]');
  await editor.click();
  await editor.fill(initialWithTriggerFixture);

  await expect(page.locator('[data-testid="diagnostics-list"]')).toContainText(
    "sm.initial-one-outgoing-no-trigger",
    { timeout: 10_000 },
  );
});
