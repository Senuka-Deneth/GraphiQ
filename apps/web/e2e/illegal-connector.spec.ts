import { expect, test } from "@playwright/test";
import {
  connectStoreElements,
  dropStencilToCanvas,
  expectIllegalFlowConnect,
  expectIllegalSvgConnect,
  selectDiagramKind,
  waitForPersistReady,
} from "./helpers.js";

test.describe("illegal connector matrix smoke", () => {
  test("class generalization from class to note is rejected", async ({ page }) => {
    await expectIllegalFlowConnect(page, "class", "class-canvas", "class", "note");
  });

  test("object link from instance to note is rejected", async ({ page }) => {
    await expectIllegalFlowConnect(page, "object", "object-canvas", "instance", "note");
  });

  test("package import from package to class is rejected", async ({ page }) => {
    await expectIllegalFlowConnect(page, "package", "package-canvas", "package", "class");
  });

  test("component assembly from component to note is rejected", async ({ page }) => {
    await expectIllegalFlowConnect(page, "component", "component-canvas", "component", "note");
  });

  test("deployment communication path from node to artifact is rejected", async ({ page }) => {
    await expectIllegalFlowConnect(page, "deployment", "deployment-canvas", "node", "artifact");
  });

  test("profile extension from stereotype to enumeration is rejected", async ({ page }) => {
    await expectIllegalFlowConnect(page, "profile", "profile-canvas", "stereotype", "enumeration");
  });

  test("use case association from actor to actor is rejected", async ({ page }) => {
    await expectIllegalFlowConnect(page, "useCase", "use-case-canvas", "actor", "actor");
  });

  test("composite structure connector from frame class to part is rejected", async ({ page }) => {
    await expectIllegalFlowConnect(
      page,
      "compositeStructure",
      "composite-structure-canvas",
      "class",
      "part",
    );
  });

  test("communication message from instance to note is rejected", async ({ page }) => {
    await expectIllegalFlowConnect(
      page,
      "communication",
      "communication-canvas",
      "instance",
      "note",
    );
  });

  test("activity object flow from object node to partition is rejected", async ({ page }) => {
    await page.goto("/");
    await waitForPersistReady(page);
    await selectDiagramKind(page, "activity");
    await page.locator('[data-relationship-tool="objectFlow"]').click();
    await dropStencilToCanvas(page, "objectNode", "activity-canvas", { x: 160, y: 180 });
    await dropStencilToCanvas(page, "activityPartition", "activity-canvas", { x: 520, y: 180 });
    await expect(page.locator(".react-flow__node")).toHaveCount(2, { timeout: 10_000 });

    const edgeCountBefore = await page.locator(".react-flow__edge").count();
    const sourceId = await page.locator(".react-flow__node").nth(0).getAttribute("data-id");
    const targetId = await page.locator(".react-flow__node").nth(1).getAttribute("data-id");
    if (sourceId === null || targetId === null) {
      throw new Error("Expected react-flow nodes to expose data-id");
    }
    await connectStoreElements(page, sourceId, targetId);

    await expect(page.locator('[data-testid="diagnostics-list"]')).toContainText(
      "rules.illegal-connector",
      { timeout: 10_000 },
    );
    await expect(page.locator(".react-flow__edge")).toHaveCount(edgeCountBefore);
  });

  test("state machine transition from state to note is rejected", async ({ page }) => {
    await expectIllegalFlowConnect(page, "stateMachine", "state-machine-canvas", "state", "note");
  });

  test("interaction overview control flow from interaction use to note is rejected", async ({
    page,
  }) => {
    await expectIllegalFlowConnect(
      page,
      "interactionOverview",
      "interaction-overview-canvas",
      "interactionUse",
      "note",
    );
  });

  test("sequence message from lifeline to note is rejected", async ({ page }) => {
    await expectIllegalSvgConnect(
      page,
      "sequence",
      "sequence-canvas",
      "lifeline",
      "note",
      '[data-testid="lifeline-head"]',
      '[data-testid="sequence-note"]',
      '[data-testid="sequence-message"]',
    );
  });

  test("timing message from lifeline to note is rejected", async ({ page }) => {
    await expectIllegalSvgConnect(
      page,
      "timing",
      "timing-canvas",
      "lifeline",
      "note",
      '[data-testid="timing-lifeline"]',
      '[data-testid="timing-note"]',
      '[data-testid="timing-message"]',
    );
  });
});
