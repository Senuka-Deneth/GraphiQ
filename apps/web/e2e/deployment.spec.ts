import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";

const fixtureDir = dirname(fileURLToPath(import.meta.url));
const prodFixture = readFileSync(
  join(fixtureDir, "../../../packages/uml-dsl/src/fixtures/deployment-prod.dsl"),
  "utf8",
);

test("deployment document nests artifacts inside device nodes with a solid communication path", async ({
  page,
}) => {
  await page.goto("/");

  await page.locator('[data-testid="new-document-kind"]').selectOption("deployment");
  await expect(page.locator('[data-testid="document-kind-badge"]')).toHaveText("deployment");
  await expect(page.locator('[data-testid="stencil"]')).toContainText("Device");
  await expect(page.locator('[data-testid="relationship-toolbar"]')).not.toContainText(
    "Manifestation",
  );

  const editor = page.locator('[data-testid="dsl-editor"]');
  await editor.click();
  await editor.fill(prodFixture);

  await expect(page.locator('[data-testid="deployment-canvas"]')).toBeVisible({
    timeout: 10_000,
  });
  await expect(page.locator('[data-testid="deployment-node"]')).toHaveCount(2);
  await expect(page.locator('[data-testid="artifact-node"]')).toHaveCount(2);

  const cluster = page.locator('[data-testid="deployment-node"]').filter({ hasText: "AppCluster" });
  const nestedArtifact = page.locator('[data-testid="artifact-node"]').filter({ hasText: "shop.war" });
  await expect(cluster).toBeVisible();
  await expect(nestedArtifact).toBeVisible();

  const clusterBox = await cluster.boundingBox();
  const artifactBox = await nestedArtifact.boundingBox();
  expect(clusterBox).toBeTruthy();
  expect(artifactBox).toBeTruthy();
  if (clusterBox === null || artifactBox === null) {
    throw new Error("expected nested artifact bounding boxes");
  }
  expect(artifactBox.x).toBeGreaterThanOrEqual(clusterBox.x);
  expect(artifactBox.y).toBeGreaterThanOrEqual(clusterBox.y);
  expect(artifactBox.x + artifactBox.width).toBeLessThanOrEqual(clusterBox.x + clusterBox.width + 1);
  expect(artifactBox.y + artifactBox.height).toBeLessThanOrEqual(clusterBox.y + clusterBox.height + 1);

  await expect(page.locator(".react-flow__edge")).toHaveCount(1);
  const dashArray = await page.locator(".react-flow__edge-path").first().evaluate((element) => {
    const path = element as SVGPathElement;
    return path.style.strokeDasharray || getComputedStyle(path).strokeDasharray;
  });
  expect(dashArray === "" || dashArray === "none").toBe(true);
});
