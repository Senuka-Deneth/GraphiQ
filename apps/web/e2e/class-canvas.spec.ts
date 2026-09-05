import { expect, test } from "@playwright/test";
import { openDslPanel } from "./helpers.js";

function normalizeDsl(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

test("canvas structural edits update DSL and moves do not", async ({ page }) => {
  await page.goto("/");
  await openDslPanel(page);

  const canvas = page.locator('[data-testid="class-canvas"]');
  const editor = page.locator('[data-testid="dsl-editor"]');
  const classStencil = page.locator('[data-stencil-item="class"]');

  await classStencil.dragTo(canvas, {
    targetPosition: { x: 120, y: 120 },
  });
  await page.waitForTimeout(400);
  await classStencil.dragTo(canvas, {
    targetPosition: { x: 360, y: 120 },
  });

  await expect(page.locator(".react-flow__node")).toHaveCount(2, { timeout: 10_000 });

  await page.locator('[data-relationship-tool="generalization"]').click();

  const nodes = page.locator(".react-flow__node");
  const sourceHandle = nodes.nth(0).locator(".react-flow__handle.source").first();
  const targetHandle = nodes.nth(1).locator(".react-flow__handle.target").first();
  await sourceHandle.dragTo(targetHandle, { force: true });

  await expect
    .poll(async () => normalizeDsl(await editor.innerText()))
    .toMatch(/Class --\|> Class2/);

  const dslAfterConnect = normalizeDsl(await editor.innerText());

  const node = nodes.nth(0);
  const box = await node.boundingBox();
  if (!box) {
    throw new Error("Expected first node to have a bounding box");
  }

  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 80, box.y + box.height / 2 + 40);
  await page.mouse.up();

  await page.waitForTimeout(300);
  await expect.poll(async () => normalizeDsl(await editor.innerText())).toBe(dslAfterConnect);
});
