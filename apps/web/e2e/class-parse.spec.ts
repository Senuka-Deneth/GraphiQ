import { expect, test } from "@playwright/test";
import { openDslPanel } from "./helpers.js";

const CLASS_GENERALIZATION_DSL = `diagram class

class A {
}

class B {
}

A --|> B
`;

test("typing class DSL renders two classes and a generalization edge", async ({ page }) => {
  await page.goto("/");
  await openDslPanel(page);

  const editor = page.locator('[data-testid="dsl-editor"]');
  await editor.click();
  await editor.fill(CLASS_GENERALIZATION_DSL);

  await expect(page.locator(".react-flow__node")).toHaveCount(2, { timeout: 10_000 });
  await expect(page.locator("#gen-hollow-triangle")).toBeAttached();
  await expect(page.locator(".react-flow__edge")).toHaveCount(1);
});
