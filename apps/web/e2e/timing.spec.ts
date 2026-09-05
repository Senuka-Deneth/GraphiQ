import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";
import { openDslPanel } from "./helpers.js";

const fixtureDir = dirname(fileURLToPath(import.meta.url));
const lampFixture = readFileSync(
  join(fixtureDir, "../../../packages/uml-dsl/src/fixtures/timing-lamp.dsl"),
  "utf8",
);

const overlappingFixture = `diagram timing Overlap

lifeline lamp: Lamp

lamp {
  Off @ 0
  On @ 10 {0..30}
  Off @ 20
}
`;

test("timing document renders lifelines and ordered states from the section 5.13 fixture", async ({
  page,
}) => {
  await page.goto("/");
  await openDslPanel(page);

  await page.locator('[data-testid="new-document-kind"]').selectOption("timing");
  await expect(page.locator('[data-testid="document-kind-badge"]')).toHaveText("timing");

  const editor = page.locator('[data-testid="dsl-editor"]');
  await editor.click();
  await editor.fill(lampFixture);

  await expect(page.locator('[data-testid="timing-canvas"]')).toBeVisible({
    timeout: 10_000,
  });
  await expect(page.getByTestId("lifeline-name").filter({ hasText: "lamp: Lamp" })).toBeVisible();
  await expect(page.locator('[data-testid="timing-state"]')).toHaveCount(3);
  await expect(page.locator('[data-testid="timing-axis-tick"]').first()).toBeVisible();

  const stateXs = await page.locator('[data-testid="timing-state"] rect').evaluateAll((rects) =>
    rects.map((rect) => Number(rect.getAttribute("x"))),
  );
  expect(stateXs.length).toBe(3);
  for (let index = 1; index < stateXs.length; index += 1) {
    expect(stateXs[index]).toBeGreaterThan(stateXs[index - 1] ?? 0);
  }
});

test("overlapping intervals show tm.intervals-non-overlapping-per-lifeline", async ({
  page,
}) => {
  await page.goto("/");
  await openDslPanel(page);

  await page.locator('[data-testid="new-document-kind"]').selectOption("timing");
  const editor = page.locator('[data-testid="dsl-editor"]');
  await editor.click();
  await editor.fill(overlappingFixture);

  await expect(page.locator('[data-testid="diagnostics-list"]')).toContainText(
    "tm.intervals-non-overlapping-per-lifeline",
    { timeout: 10_000 },
  );
});
