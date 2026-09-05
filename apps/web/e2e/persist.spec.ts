import { expect, test } from "@playwright/test";

const PERSIST_CLASS_DSL = `diagram class Persisted

class Order {
  +id: String
}
`;

test("reload restores the last saved diagram and DSL", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('[data-testid="persist-state"][data-value="saved"]')).toBeAttached({
    timeout: 10_000,
  });

  const editor = page.locator('[data-testid="dsl-editor"]');
  await editor.click();
  await editor.fill(PERSIST_CLASS_DSL);

  await expect(page.locator(".react-flow__node")).toHaveCount(1, { timeout: 10_000 });
  await expect(page.locator('[data-testid="persist-state"][data-value="saved"]')).toBeAttached({
    timeout: 10_000,
  });

  await page.reload();
  await expect(page.locator('[data-testid="persist-state"][data-value="saved"]')).toBeAttached({
    timeout: 10_000,
  });

  await expect(page.locator(".react-flow__node")).toHaveCount(1, { timeout: 10_000 });
  await expect(editor).toContainText("class Order");
  await expect(editor).toContainText("+id: String");
});
