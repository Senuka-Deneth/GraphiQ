import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";

const fixtureDir = dirname(fileURLToPath(import.meta.url));
const carFixture = readFileSync(
  join(fixtureDir, "../../../packages/uml-dsl/src/fixtures/compositeStructure-car.dsl"),
  "utf8",
);

test("composite structure document renders frame, parts, border port, and connector", async ({
  page,
}) => {
  await page.goto("/");

  await page.locator('[data-testid="new-document-kind"]').selectOption("compositeStructure");
  await expect(page.locator('[data-testid="document-kind-badge"]')).toHaveText(
    "compositeStructure",
  );
  await expect(page.locator('[data-testid="stencil"]')).toContainText("Part");
  await expect(page.locator('[data-testid="stencil"]')).toContainText("Port");

  const editor = page.locator('[data-testid="dsl-editor"]');
  await editor.click();
  await editor.fill(carFixture);

  await expect(page.locator('[data-testid="composite-structure-canvas"]')).toBeVisible({
    timeout: 10_000,
  });
  await expect(page.locator('[data-testid="cs-frame-node"]')).toHaveCount(1);
  await expect(page.locator('[data-testid="cs-part-node"]')).toHaveCount(2);
  await expect(page.locator('[data-testid="port-node"]')).toHaveCount(2);
  await expect(page.locator(".react-flow__edge")).toHaveCount(1);

  const frameBox = await page.locator('[data-testid="cs-frame-node"]').first().boundingBox();
  expect(frameBox).not.toBeNull();
  if (frameBox) {
    const portCount = await page.locator('[data-testid="port-node"]').count();
    let portOnFrameBorder = false;
    for (let index = 0; index < portCount; index += 1) {
      const portBox = await page.locator('[data-testid="port-node"]').nth(index).boundingBox();
      if (portBox === null) {
        continue;
      }
      const nearLeft = Math.abs(portBox.x - frameBox.x) <= 12;
      const nearRight =
        Math.abs(portBox.x + portBox.width - (frameBox.x + frameBox.width)) <= 12;
      if (nearLeft || nearRight) {
        portOnFrameBorder = true;
        break;
      }
    }
    expect(portOnFrameBorder).toBe(true);
  }
});

test("composite structure toolbar omits generalization", async ({ page }) => {
  await page.goto("/");

  await page.locator('[data-testid="new-document-kind"]').selectOption("compositeStructure");
  await expect(page.locator('[data-testid="relationship-toolbar"]')).not.toContainText(
    "Generalization",
  );
  await expect(page.locator('[data-relationship-tool="connector"]')).toBeVisible();
});
