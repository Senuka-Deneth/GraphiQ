import { readFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";
import { openDslPanel, waitForPersistReady } from "./helpers.js";

const complex = readFileSync(resolve("e2e/fixtures/component-storefront.dsl"), "utf8");
const evidence = resolve("../../artifacts/diagram-audit");
mkdirSync(evidence, { recursive: true });

test("code stays a draft until Submit; detects kind; Clear preserves generated diagram", async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto("/");
  await waitForPersistReady(page);
  await openDslPanel(page);
  await page.getByTestId("dsl-editor").fill(complex);
  await page.waitForTimeout(350);
  await expect(page.getByTestId("document-kind-badge")).toHaveText("class");
  await expect(page.locator(".react-flow__node")).toHaveCount(0);
  await page.getByTestId("submit-dsl").click();
  await expect(page.getByTestId("document-kind-badge")).toHaveText("component");
  await expect(page.getByTestId("component-node")).toHaveCount(7);
  await expect(page.locator(".react-flow__edge")).toHaveCount(6);
  await page.waitForTimeout(350);
  const overlaps = await page.evaluate(() => {
    const bodies = [...document.querySelectorAll('[data-testid="component-node"]')].map(e => e.getBoundingClientRect());
    const interfaces = [...document.querySelectorAll('[data-testid="interface-lollipop"]')].map(e => e.getBoundingClientRect());
    return interfaces.filter(a => bodies.some(b => a.left < b.right - 2 && a.right > b.left + 2 && a.top < b.bottom - 2 && a.bottom > b.top + 2)).length;
  });
  expect(overlaps).toBe(0);
  await page.screenshot({ path: `${evidence}/component-editor.png` });
  await page.getByTestId("clear-dsl").click();
  await expect(page.getByTestId("dsl-editor")).toHaveText("");
  await expect(page.getByTestId("submit-dsl")).toBeDisabled();
  await expect(page.getByTestId("component-node")).toHaveCount(7);
  await page.getByTestId("dsl-panel-toggle").click();
  await page.getByTestId("flow-fit-view").click();
  await page.mouse.move(700, 900);
  await page.screenshot({ path: `${evidence}/component-diagram.png` });
});

test("upload stages code and right controls expand without overlapping each other", async ({ page }) => {
  await page.goto("/");
  await waitForPersistReady(page);
  await page.getByTestId("import-dsl-input").setInputFiles({ name: "shop.dsl", mimeType: "text/plain", buffer: Buffer.from(complex) });
  await expect(page.getByTestId("dsl-editor-panel")).toHaveAttribute("aria-hidden", "false");
  await expect(page.getByTestId("dsl-editor")).toContainText("Storefront");
  await expect(page.getByTestId("document-kind-badge")).toHaveText("class");
  const toggle = page.getByTestId("dsl-panel-toggle");
  const initial = (await toggle.boundingBox())!.width;
  await toggle.hover();
  await expect.poll(async () => (await toggle.boundingBox())!.width).toBeGreaterThan(initial + 50);
  await expect(toggle.locator(".graphiq-button-label")).toHaveCSS("opacity", "1");
  await page.mouse.move(500, 500);
  await toggle.focus();
  await expect(toggle.locator(".graphiq-button-label")).toHaveCSS("opacity", "1");
  const boxes = await page.locator(".graphiq-right-tools button").evaluateAll(els => els.map(e => { const r = e.getBoundingClientRect(); return { top: r.top, bottom: r.bottom }; }));
  for (let i = 1; i < boxes.length; i++) expect(boxes[i]!.top).toBeGreaterThan(boxes[i - 1]!.bottom);
});

const fixtures = ["class-order-domain", "object-checkout", "package-system", "component-shop", "deployment-prod", "profile-java", "usecase-storefront", "compositeStructure-car", "communication-checkout", "activity-fulfill-order", "state-machine-order-lifecycle", "sequence-checkout", "timing-lamp", "interaction-overview-order-flow"];
for (const fixture of fixtures) {
  test(`notation audit: ${fixture}`, async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 1000 });
    const source = readFileSync(resolve(`../../packages/uml-dsl/src/fixtures/${fixture}.dsl`), "utf8");
    const kind = source.match(/diagram (\w+)/)![1]!;
    const errors: string[] = [];
    page.on("pageerror", e => errors.push(e.message));
    await page.goto("/");
    await waitForPersistReady(page);
    await openDslPanel(page);
    await page.getByTestId("dsl-editor").fill(source);
    await page.getByTestId("submit-dsl").click();
    await expect(page.getByTestId("document-kind-badge")).toHaveText(kind);
    await page.getByTestId("dsl-panel-toggle").click();
    await expect.poll(async () => page.evaluate(() => {
      const state = (window as any).__graphiqDocumentStore.getState();
      return Object.keys(state.document.overlay.nodes).length;
    })).toBeGreaterThan(0);
    await page.waitForTimeout(250);
    if (await page.getByTestId("flow-fit-view").count()) await page.getByTestId("flow-fit-view").click();
    await page.mouse.move(1450, 950);
    await page.waitForTimeout(350);
    await page.screenshot({ path: `${evidence}/${fixture}.png` });
    expect(errors).toEqual([]);
  });
}

for (const width of [390, 768]) {
  test(`code controls fit at ${width}px with reduced motion`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await waitForPersistReady(page);
    await openDslPanel(page);
    await expect(page.getByTestId("submit-dsl")).toBeVisible();
    const panel = await page.getByTestId("dsl-editor-panel").boundingBox();
    expect(panel!.x).toBeGreaterThanOrEqual(0);
    expect(panel!.x + panel!.width).toBeLessThanOrEqual(width);
    const buttons = await page.locator('[data-testid="dsl-editor-panel"] button').evaluateAll(els => els.map(e => e.getBoundingClientRect().toJSON()));
    for (const box of buttons) { expect(box.x).toBeGreaterThanOrEqual(0); expect(box.right).toBeLessThanOrEqual(width); }
    const controls = await page.locator('.graphiq-right-tools button, #graphiq-canvas-tools button').evaluateAll(els => els.map(e => e.getBoundingClientRect().toJSON()));
    for (let i = 0; i < controls.length; i++) for (let j = i + 1; j < controls.length; j++) {
      const a = controls[i]!, b = controls[j]!;
      expect(a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top).toBe(false);
    }
    await page.screenshot({ path: `${evidence}/responsive-${width}.png` });
  });
}

test("sequence self calls and alternative operands retain UML notation", async ({ page }) => {
  await page.goto("/");
  await waitForPersistReady(page);
  await openDslPanel(page);
  await page.getByTestId("dsl-editor").fill(`diagram sequence Alternatives
lifeline client: Client
lifeline server: Server
alt {
  [ready]
  client -> server : request()
  [else]
  client -> client : retry()
}
`);
  await page.getByTestId("submit-dsl").click();
  await expect(page.getByTestId("sequence-message")).toHaveCount(2);
  const frame = page.getByTestId("combined-fragment");
  await expect(frame).toContainText("[ready]");
  await expect(frame).toContainText("[else]");
  await expect(frame.locator("rect")).not.toHaveAttribute("stroke-dasharray");
  await expect(frame.locator("line")).toHaveAttribute("stroke-dasharray", "6 4");
  await expect(page.getByTestId("sequence-message").nth(1).locator("path")).toHaveAttribute("d", /h 48 v 28 h -48/);
  const guardBoxes = await frame.locator("text").evaluateAll(els => els.map(e => e.getBoundingClientRect().toJSON()));
  expect(guardBoxes[2]!.top).toBeGreaterThan(guardBoxes[1]!.bottom);
  await page.getByTestId("dsl-panel-toggle").click();
  await page.mouse.move(1000, 600);
  await page.waitForTimeout(350);
  await page.screenshot({ path: `${evidence}/sequence-alternatives.png` });
});
