import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { connectStoreElements, dropStencilToCanvas, openDslPanel, selectDiagramKind, waitForPersistReady } from "./helpers.js";

for (const provider of ["chatgpt", "gemini"]) {
  test(`renders all flows in the user's ${provider} example`, async ({ page }) => {
    const source = readFileSync(new URL(`../../../packages/uml-dsl/src/fixtures/activity-hospital-${provider}.dsl`, import.meta.url), "utf8");
    await page.goto("/");
    await waitForPersistReady(page);
    if (provider === "gemini") {
      await page.getByTestId("import-dsl-input").setInputFiles({
        name: "gemini.md", mimeType: "text/markdown", buffer: Buffer.from(`\`\`\`text\n${source}\`\`\``),
      });
      await expect(page.getByTestId("document-kind-badge")).toHaveText("activity");
    } else {
      await selectDiagramKind(page, "activity");
      await openDslPanel(page);
      await page.getByTestId("dsl-editor").fill(source);
    }
    await expect(page.locator(".react-flow__edge")).toHaveCount(source.split("\n").filter((line) => line.includes("-->")).length);
    await expect(page.locator('[data-testid="diagnostics-list"] [data-severity="error"]')).toHaveCount(0);
    await page.getByRole("button", { name: "Fit view", exact: true }).click();
    await expect(page.locator(".react-flow__node")).toContainText(["Patient", "GeneratePaymentReceipt"]);
  });
}

test("plain-language errors show exact locations, navigate from a collapsed editor, and keep the last diagram", async ({ page }) => {
  await page.goto("/");
  await waitForPersistReady(page);
  await selectDiagramKind(page, "activity");
  await openDslPanel(page);
  const editor = page.getByTestId("dsl-editor");
  await editor.fill("diagram activity\naction Stable\ninitial --> Stable\nStable --> final");
  await expect(page.locator(".react-flow__edge")).toHaveCount(2);
  await editor.fill("diagram activity\naction Stable\nStable -->");
  const diagnostics = page.getByTestId("diagnostics-list");
  await expect(diagnostics).toContainText("Expected a node name");
  await expect(diagnostics).not.toContainText("Expecting one of these possible Token sequences");
  await expect(page.locator(".react-flow__edge")).toHaveCount(2);
  await page.getByRole("button", { name: "Hide DSL", exact: true }).click();
  await diagnostics.getByRole("button", { name: "Line 3, column 11" }).click();
  await expect(page.getByRole("button", { name: "Hide DSL", exact: true })).toBeVisible();
  await expect(editor).toBeFocused();
  await expect(page.locator(".cm-lintPoint-error")).toBeAttached();
  await editor.fill("diagram activity\naction Stable\ninitial --> Stable\nStable --> final");
  await expect(diagnostics).toContainText("No issues");
  await expect(page.locator(".react-flow__edge")).toHaveCount(2);
});

test("unknown node errors identify the reference and select it on click", async ({ page }) => {
  await page.goto("/");
  await waitForPersistReady(page);
  await selectDiagramKind(page, "activity");
  await openDslPanel(page);
  await page.getByTestId("dsl-editor").fill("diagram activity\naction Login\nLogin --> Missing");
  const diagnostics = page.getByTestId("diagnostics-list");
  await expect(diagnostics).toContainText("'Missing' is not declared");
  await diagnostics.getByRole("button", { name: "Line 3, column 11" }).click();
  await expect.poll(() => page.evaluate(() => window.getSelection()?.toString())).toBe("Missing");
});

test("a default decision from the palette remains valid after connecting it", async ({ page }) => {
  await page.goto("/");
  await waitForPersistReady(page);
  await selectDiagramKind(page, "activity");
  await dropStencilToCanvas(page, "decisionNode", "activity-canvas", { x: 120, y: 120 });
  await dropStencilToCanvas(page, "action", "activity-canvas", { x: 300, y: 120 });
  const nodes = page.locator(".react-flow__node");
  await expect(nodes).toHaveCount(2);
  const sourceId = (await nodes.nth(0).getAttribute("data-id"))!;
  const targetId = (await nodes.nth(1).getAttribute("data-id"))!;
  await connectStoreElements(page, sourceId, targetId);
  await expect(page.locator(".react-flow__edge")).toHaveCount(1);
  await openDslPanel(page);
  await expect(page.getByTestId("dsl-editor")).toContainText("decision --> Action");
  await expect(page.locator('[data-testid="diagnostics-list"] [data-severity="error"]')).toHaveCount(0);
});

test("error panel fits a narrow viewport and hidden controls cannot receive focus", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await waitForPersistReady(page);
  await page.getByTestId("import-dsl-input").setInputFiles({
    name: "diagram.md", mimeType: "text/markdown",
    buffer: Buffer.from("```text\ndiagram activity\naction Login\nLogin --> Missing\n```"),
  });
  const panel = page.getByTestId("diagnostics-list");
  await expect(panel).toContainText("'Missing' is not declared");
  await expect.poll(async () => {
    const box = await panel.boundingBox();
    return box !== null && box.x >= 0 && box.x + box.width <= 390 && box.width >= 260;
  }).toBe(true);
  await expect(page.getByTestId("dsl-editor-panel")).toHaveAttribute("inert", "");
  await expect.poll(() => panel.evaluate((element) => getComputedStyle(element).opacity)).toBe("1");
  await page.screenshot({ path: "test-results/activity-error-mobile.png" });
});
