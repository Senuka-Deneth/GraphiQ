import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";
import { openDslPanel } from "./helpers.js";

const fixtureDir = dirname(fileURLToPath(import.meta.url));
const storefrontFixture = readFileSync(
  join(fixtureDir, "../../../packages/uml-dsl/src/fixtures/usecase-storefront.dsl"),
  "utf8",
);

const illegalActorAssocFixture = `diagram useCase BadAssoc

actor Customer
actor Clerk

Customer -- Clerk
`;

test("use case document renders actors, ellipses, and include label", async ({ page }) => {
  await page.goto("/");
  await openDslPanel(page);

  await page.locator('[data-testid="new-document-kind"]').selectOption("useCase");
  await expect(page.locator('[data-testid="document-kind-badge"]')).toHaveText("useCase");
  await expect(page.locator('[data-testid="stencil"]')).toContainText("Actor");
  await expect(page.locator('[data-testid="stencil"]')).toContainText("Subject");

  const editor = page.locator('[data-testid="dsl-editor"]');
  await editor.click();
  await editor.fill(storefrontFixture);

  await expect(page.locator('[data-testid="use-case-canvas"]')).toBeVisible({
    timeout: 10_000,
  });
  await expect(page.locator('[data-testid="actor-node"]')).toHaveCount(2);
  await expect(page.locator('[data-testid="use-case-node"]')).toHaveCount(3);
  await expect(page.locator('[data-testid="subject-node"]')).toHaveCount(1);

  await expect(page.locator(".react-flow__edge")).toHaveCount(4);

  const canvas = page.locator('[data-testid="use-case-canvas"]');
  await expect(canvas.getByText("«include»")).toBeVisible();
  await expect(canvas.getByText("«extend»")).toBeVisible();

  const edgePaths = page.locator(".react-flow__edge-path");
  const pathCount = await edgePaths.count();
  let dashedIncludeMarker = false;
  for (let index = 0; index < pathCount; index += 1) {
    const markerEnd = await edgePaths.nth(index).getAttribute("marker-end");
    if (markerEnd?.includes("dep-open") === true) {
      dashedIncludeMarker = true;
      break;
    }
  }
  expect(dashedIncludeMarker).toBe(true);

  const actorBox = await page.locator('[data-testid="actor-node"]').first().boundingBox();
  const subjectBox = await page.locator('[data-testid="subject-node"]').first().boundingBox();
  expect(actorBox).not.toBeNull();
  expect(subjectBox).not.toBeNull();
  if (actorBox && subjectBox) {
    expect(actorBox.x + actorBox.width).toBeLessThanOrEqual(subjectBox.x);
  }
});

test("actor-to-actor association shows uc.assoc.actor-to-usecase", async ({ page }) => {
  await page.goto("/");
  await openDslPanel(page);

  await page.locator('[data-testid="new-document-kind"]').selectOption("useCase");
  const editor = page.locator('[data-testid="dsl-editor"]');
  await editor.click();
  await editor.fill(illegalActorAssocFixture);

  await expect(page.locator('[data-testid="diagnostics-list"]')).toContainText(
    "uc.assoc.actor-to-usecase",
    { timeout: 10_000 },
  );
});
