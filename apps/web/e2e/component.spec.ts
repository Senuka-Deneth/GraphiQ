import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";
import { openDslPanel } from "./helpers.js";

const fixtureDir = dirname(fileURLToPath(import.meta.url));
const shopFixture = readFileSync(
  join(fixtureDir, "../../../packages/uml-dsl/src/fixtures/component-shop.dsl"),
  "utf8",
);

const illegalAssemblyFixture = `diagram component BadAssembly

component A {
  provides Foo
}

component B {
  provides Bar
}

A required Foo -- provided Bar B
`;

test("component document renders assembly between provided and required interfaces", async ({
  page,
}) => {
  await page.goto("/");
  await openDslPanel(page);

  await page.locator('[data-testid="new-document-kind"]').selectOption("component");
  await expect(page.locator('[data-testid="document-kind-badge"]')).toHaveText("component");
  await expect(page.locator('[data-stencil-item="actor"]')).toHaveCount(0);

  const editor = page.locator('[data-testid="dsl-editor"]');
  await editor.click();
  await editor.fill(shopFixture);

  await expect(page.locator('[data-testid="component-canvas"]')).toBeVisible({
    timeout: 10_000,
  });
  await expect(page.locator('[data-testid="component-node"]')).toHaveCount(2);
  await expect(page.locator('[data-testid="interface-lollipop"]')).toHaveCount(3);
  await expect(page.locator(".react-flow__edge")).toHaveCount(1);
});

test("assembly between two provided interfaces shows cmp.assembly-provided-to-required", async ({
  page,
}) => {
  await page.goto("/");
  await openDslPanel(page);

  await page.locator('[data-testid="new-document-kind"]').selectOption("component");
  const editor = page.locator('[data-testid="dsl-editor"]');
  await editor.click();
  await editor.fill(illegalAssemblyFixture);

  await expect(page.locator('[data-testid="diagnostics-list"]')).toContainText(
    "cmp.assembly-provided-to-required",
    { timeout: 10_000 },
  );
});
