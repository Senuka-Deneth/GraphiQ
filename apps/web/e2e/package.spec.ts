import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";

const fixtureDir = dirname(fileURLToPath(import.meta.url));
const systemFixture = readFileSync(
  join(fixtureDir, "../../../packages/uml-dsl/src/fixtures/package-system.dsl"),
  "utf8",
);

const mergeCycleFixture = `diagram package MergeCycle

package a {
  class A
}

package b {
  class B
}

a ..> b : «merge»
b ..> a : «merge»
`;

test("package document renders nested classifiers inside packages", async ({ page }) => {
  await page.goto("/");

  await page.locator('[data-testid="new-document-kind"]').selectOption("package");
  await expect(page.locator('[data-testid="document-kind-badge"]')).toHaveText("package");

  const editor = page.locator('[data-testid="dsl-editor"]');
  await editor.click();
  await editor.fill(systemFixture);

  await expect(page.locator('[data-testid="package-canvas"]')).toBeVisible({
    timeout: 10_000,
  });
  await expect(page.locator('[data-testid="package-node"]')).toHaveCount(2);
  await expect(page.locator('.react-flow__node[data-id]').filter({ hasText: "Invoice" })).toBeVisible();
});

test("merge cycle shows pkg.no-cycle-merge diagnostic and marks edges", async ({ page }) => {
  await page.goto("/");

  await page.locator('[data-testid="new-document-kind"]').selectOption("package");
  const editor = page.locator('[data-testid="dsl-editor"]');
  await editor.click();
  await editor.fill(mergeCycleFixture);

  await expect(page.locator('[data-testid="diagnostics-list"]')).toContainText("pkg.no-cycle-merge", {
    timeout: 10_000,
  });
  await expect(page.locator(".react-flow__edge.graphiq-diagnostic-error")).toHaveCount(2);
});
