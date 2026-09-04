import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";

const fixtureDir = dirname(fileURLToPath(import.meta.url));
const checkoutFixture = readFileSync(
  join(fixtureDir, "../../../packages/uml-dsl/src/fixtures/sequence-checkout.dsl"),
  "utf8",
);

const unmatchedReplyFixture = `diagram sequence UnmatchedReply

lifeline a: A
lifeline b: B

a -->> b : orphan
`;

test("sequence document renders lifelines and ordered messages from the section 5.11 fixture", async ({
  page,
}) => {
  await page.goto("/");

  await page.locator('[data-testid="new-document-kind"]').selectOption("sequence");
  await expect(page.locator('[data-testid="document-kind-badge"]')).toHaveText("sequence");

  const editor = page.locator('[data-testid="dsl-editor"]');
  await editor.click();
  await editor.fill(checkoutFixture);

  await expect(page.locator('[data-testid="sequence-canvas"]')).toBeVisible({
    timeout: 10_000,
  });
  await expect(page.getByTestId("lifeline-name").filter({ hasText: "customer: Actor" })).toBeVisible();
  await expect(page.getByTestId("lifeline-name").filter({ hasText: "shop: Shop" })).toBeVisible();
  await expect(page.getByTestId("lifeline-name").filter({ hasText: "pay: Payments" })).toBeVisible();
  await expect(page.locator('[data-testid="sequence-message"]')).toHaveCount(4);
  await expect(page.locator('[data-testid="execution-spec"]')).toHaveCount(2);

  const messageYs = await page.locator('[data-testid="sequence-message"] line').evaluateAll((lines) =>
    lines.map((line) => Number(line.getAttribute("y1"))),
  );
  expect(messageYs.length).toBe(4);
  for (let index = 1; index < messageYs.length; index += 1) {
    expect(messageYs[index]).toBeGreaterThan(messageYs[index - 1] ?? 0);
  }

  await expect(
    page.locator('[data-testid="sequence-message"][data-marker-id="msg-sync-filled"]'),
  ).toHaveCount(2);
  await expect(
    page.locator('[data-testid="sequence-message"][data-marker-id="msg-reply-open"]'),
  ).toHaveCount(2);
});

test("unmatched reply shows sd.reply-matches-synch-call", async ({ page }) => {
  await page.goto("/");

  await page.locator('[data-testid="new-document-kind"]').selectOption("sequence");
  const editor = page.locator('[data-testid="dsl-editor"]');
  await editor.click();
  await editor.fill(unmatchedReplyFixture);

  await expect(page.locator('[data-testid="diagnostics-list"]')).toContainText(
    "sd.reply-matches-synch-call",
    { timeout: 10_000 },
  );
});
