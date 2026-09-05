import { expect, test } from "@playwright/test";
import { openDslPanel, waitForPersistReady } from "./helpers.js";

test("diagnostics stay hidden until an error appears", async ({ page }) => {
  await page.goto("/");
  await waitForPersistReady(page);

  await expect(page.locator('[data-testid="diagnostics-toggle"]')).toBeVisible();
  await expect(page.locator('[data-testid="dsl-panel-toggle"]')).toBeVisible();

  await openDslPanel(page);
  const editor = page.locator('[data-testid="dsl-editor"]');
  await editor.click();
  await editor.fill(`diagram class

class A {
}

interface B {
}

A --|> B
`);

  await expect(page.locator('[data-testid="diagnostics-list"]')).toContainText(
    /class\.gen\.same-metaclass|rules\.illegal-connector/,
    { timeout: 10_000 },
  );
  await expect(page.getByLabel("Hide diagnostics")).toBeVisible();
});

test("double-clicking the canvas adds a note", async ({ page }) => {
  await page.goto("/");
  await waitForPersistReady(page);

  page.once("dialog", (dialog) => {
    void dialog.accept("Hello");
  });

  const canvas = page.locator('[data-testid="class-canvas"]');
  await canvas.dblclick({ position: { x: 240, y: 180 } });
  await expect(page.locator(".react-flow__node")).toHaveCount(1, { timeout: 10_000 });
  await expect(page.locator(".react-flow__node")).toContainText("Hello");
});

test("selected edge toolbar can change generalization notation", async ({ page }) => {
  await page.goto("/");
  await waitForPersistReady(page);
  await openDslPanel(page);

  const canvas = page.locator('[data-testid="class-canvas"]');
  const classStencil = page.locator('[data-stencil-item="class"]');
  await classStencil.dragTo(canvas, { targetPosition: { x: 120, y: 120 } });
  await page.waitForTimeout(400);
  await classStencil.dragTo(canvas, { targetPosition: { x: 360, y: 120 } });
  await expect(page.locator(".react-flow__node")).toHaveCount(2, { timeout: 10_000 });

  await page.locator('[data-relationship-tool="association"]').click();
  const nodes = page.locator(".react-flow__node");
  await nodes
    .nth(0)
    .locator(".react-flow__handle.source")
    .first()
    .dragTo(nodes.nth(1).locator(".react-flow__handle.target").first(), { force: true });
  await expect(page.locator(".react-flow__edge")).toHaveCount(1, { timeout: 10_000 });

  await page.locator(".react-flow__edge-interaction").first().click({ force: true });
  await expect(page.locator('[data-testid="edge-style-toolbar"]')).toBeVisible();

  await page.locator('[data-testid="edge-end-head"]').selectOption("gen-hollow-triangle");
  const editor = page.locator('[data-testid="dsl-editor"]');
  await expect
    .poll(async () => (await editor.innerText()).replace(/\s+/g, " ").trim())
    .toMatch(/Class --\|> Class2/);
});

test("illegal head change keeps the previous relationship", async ({ page }) => {
  await page.goto("/");
  await waitForPersistReady(page);
  await openDslPanel(page);

  const canvas = page.locator('[data-testid="class-canvas"]');
  await page.locator('[data-stencil-item="class"]').dragTo(canvas, {
    targetPosition: { x: 120, y: 120 },
  });
  await page.waitForTimeout(400);
  await page.locator('[data-stencil-item="interface"]').dragTo(canvas, {
    targetPosition: { x: 360, y: 120 },
  });
  await expect(page.locator(".react-flow__node")).toHaveCount(2, { timeout: 10_000 });

  await page.locator('[data-relationship-tool="association"]').click();
  const nodes = page.locator(".react-flow__node");
  await nodes
    .nth(0)
    .locator(".react-flow__handle.source")
    .first()
    .dragTo(nodes.nth(1).locator(".react-flow__handle.target").first(), { force: true });
  await expect(page.locator(".react-flow__edge")).toHaveCount(1, { timeout: 10_000 });

  const editor = page.locator('[data-testid="dsl-editor"]');
  await expect
    .poll(async () => (await editor.innerText()).replace(/\s+/g, " ").trim())
    .toMatch(/Class -- Interface/);
  const dslBefore = (await editor.innerText()).replace(/\s+/g, " ").trim();

  await page.locator(".react-flow__edge-interaction").first().click({ force: true });
  await expect(page.locator('[data-testid="edge-style-toolbar"]')).toBeVisible();
  await page.locator('[data-testid="edge-end-head"]').selectOption("gen-hollow-triangle");

  await expect(page.locator('[data-testid="diagnostics-list"]')).toContainText(
    "rules.illegal-connector",
    { timeout: 10_000 },
  );
  await expect
    .poll(async () => (await editor.innerText()).replace(/\s+/g, " ").trim())
    .toBe(dslBefore);
  await expect(editor).not.toContainText("--|>");
});
