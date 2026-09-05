import { expect, type Page } from "@playwright/test";

export async function waitForPersistReady(page: Page): Promise<void> {
  await expect(page.locator('[data-testid="persist-state"][data-value="saved"]')).toBeAttached({
    timeout: 10_000,
  });
}

export async function openDslPanel(page: Page): Promise<void> {
  const hideButton = page.getByRole("button", { name: "Hide DSL" });
  if (!(await hideButton.isVisible())) {
    await page.getByRole("button", { name: "Show DSL" }).click();
    await expect(hideButton).toBeVisible();
  }

  const panel = page.locator('[data-testid="dsl-editor-panel"]');
  await expect
    .poll(async () => (await panel.boundingBox())?.width ?? 0)
    .toBeGreaterThan(200);
}

export async function selectDiagramKind(page: Page, kind: string): Promise<void> {
  await page.locator('[data-testid="new-document-kind"]').selectOption(kind);
  await expect(page.locator('[data-testid="document-kind-badge"]')).toHaveText(kind);
}

export async function dropStencilToCanvas(
  page: Page,
  stencilId: string,
  canvasTestId: string,
  position: { x: number; y: number },
): Promise<void> {
  await page.locator(`[data-stencil-item="${stencilId}"]`).dragTo(
    page.locator(`[data-testid="${canvasTestId}"]`),
    { targetPosition: position },
  );
  await page.waitForTimeout(400);
}

export async function expectIllegalFlowConnect(
  page: Page,
  kind: string,
  canvasTestId: string,
  firstStencil: string,
  secondStencil: string,
): Promise<void> {
  await page.goto("/");
  await waitForPersistReady(page);
  await selectDiagramKind(page, kind);
  await dropStencilToCanvas(page, firstStencil, canvasTestId, { x: 120, y: 120 });
  await dropStencilToCanvas(page, secondStencil, canvasTestId, { x: 360, y: 120 });
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
}

export async function connectStoreElements(
  page: Page,
  sourceId: string,
  targetId: string,
  options?: { time?: number },
): Promise<void> {
  await page.evaluate(
    ({ source, target, time }) => {
      const store = (
        window as Window & {
          __graphiqDocumentStore?: {
            getState: () => {
              connectElements: (
                sourceId: string,
                targetId: string,
                connectOptions?: { time?: number },
              ) => Promise<void>;
            };
          };
        }
      ).__graphiqDocumentStore;
      if (store === undefined) {
        throw new Error("GraphiQ document store is unavailable");
      }
      void store.getState().connectElements(source, target, time === undefined ? undefined : { time });
    },
    { source: sourceId, target: targetId, time: options?.time },
  );
  await page.waitForTimeout(300);
}

export async function expectIllegalSvgConnect(
  page: Page,
  kind: string,
  canvasTestId: string,
  firstStencil: string,
  secondStencil: string,
  firstSelector: string,
  secondSelector: string,
  messageSelector: string,
): Promise<void> {
  await page.goto("/");
  await waitForPersistReady(page);
  await selectDiagramKind(page, kind);
  await dropStencilToCanvas(page, firstStencil, canvasTestId, { x: 200, y: 120 });
  await dropStencilToCanvas(page, secondStencil, canvasTestId, { x: 420, y: 220 });

  await expect(page.locator(firstSelector)).toHaveCount(1, { timeout: 10_000 });
  await expect(page.locator(secondSelector)).toHaveCount(1);

  const sourceId = await page.locator(firstSelector).first().getAttribute("data-element-id");
  const targetId = await page.locator(secondSelector).first().getAttribute("data-element-id");
  if (sourceId === null || targetId === null) {
    throw new Error("Expected SVG elements to expose data-element-id");
  }

  const messageCountBefore = await page.locator(messageSelector).count();
  await connectStoreElements(page, sourceId, targetId);

  await expect(page.locator('[data-testid="diagnostics-list"]')).toContainText(
    "rules.illegal-connector",
    { timeout: 10_000 },
  );
  await expect(page.locator(messageSelector)).toHaveCount(messageCountBefore);
}
