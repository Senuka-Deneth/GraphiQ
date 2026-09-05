import { expect, test } from "@playwright/test";
import { waitForPersistReady, openDslPanel } from "./helpers.js";

const IMPLEMENTED_KINDS = [
  "class",
  "object",
  "package",
  "component",
  "deployment",
  "profile",
  "useCase",
  "compositeStructure",
  "communication",
  "activity",
  "stateMachine",
  "sequence",
  "timing",
  "interactionOverview",
] as const;

test.describe("implemented diagram kind smoke", () => {
  test("new-document control lists all implemented kinds", async ({ page }) => {
    await page.goto("/");
    await openDslPanel(page);
    await waitForPersistReady(page);

    const options = page.locator('[data-testid="new-document-kind"] option');
    await expect(options).toHaveCount(IMPLEMENTED_KINDS.length);
    for (const kind of IMPLEMENTED_KINDS) {
      await expect(options.filter({ hasText: kind })).toHaveCount(1);
    }
  });

  test("class drag does not change DSL", async ({ page }) => {
    await page.goto("/");
    await openDslPanel(page);
    await waitForPersistReady(page);

    const canvas = page.locator('[data-testid="class-canvas"]');
    const editor = page.locator('[data-testid="dsl-editor"]');
    const classStencil = page.locator('[data-stencil-item="class"]');

    await classStencil.dragTo(canvas, { targetPosition: { x: 120, y: 120 } });
    await page.waitForTimeout(400);
    await classStencil.dragTo(canvas, { targetPosition: { x: 360, y: 120 } });
    await expect(page.locator(".react-flow__node")).toHaveCount(2, { timeout: 10_000 });

    await page.locator('[data-relationship-tool="generalization"]').click();
    const nodes = page.locator(".react-flow__node");
    await nodes
      .nth(0)
      .locator(".react-flow__handle.source")
      .first()
      .dragTo(nodes.nth(1).locator(".react-flow__handle.target").first(), { force: true });

    await expect
      .poll(async () => (await editor.innerText()).replace(/\s+/g, " ").trim())
      .toMatch(/Class --\|> Class2/);

    const dslAfterConnect = (await editor.innerText()).replace(/\s+/g, " ").trim();
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

    await expect
      .poll(async () => (await editor.innerText()).replace(/\s+/g, " ").trim())
      .toBe(dslAfterConnect);
  });
});
