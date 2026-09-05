import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";
import { openDslPanel } from "./helpers.js";

const fixtureDir = dirname(fileURLToPath(import.meta.url));
const javaFixture = readFileSync(
  join(fixtureDir, "../../../packages/uml-dsl/src/fixtures/profile-java.dsl"),
  "utf8",
);

const illegalMetaclassFixture = `diagram profile BadProfile

stereotype Entity {
  table: String
}

extension Entity -> Order
`;

test("profile extension renders a filled triangle marker", async ({ page }) => {
  await page.goto("/");
  await openDslPanel(page);

  await page.locator('[data-testid="new-document-kind"]').selectOption("profile");
  await expect(page.locator('[data-testid="document-kind-badge"]')).toHaveText("profile");
  await expect(page.locator('[data-testid="stencil"]')).toContainText("Stereotype");
  await expect(page.locator('[data-testid="stencil"]')).toContainText("Metaclass");

  const editor = page.locator('[data-testid="dsl-editor"]');
  await editor.click();
  await editor.fill(javaFixture);

  await expect(page.locator('[data-testid="profile-canvas"]')).toBeVisible({
    timeout: 10_000,
  });
  await expect(page.locator('[data-testid="profile-canvas"]').getByText("«stereotype»")).toBeVisible();
  await expect(page.locator('[data-testid="profile-canvas"]').getByText("Entity")).toBeVisible();
  await expect(page.locator('[data-testid="profile-canvas"]').getByText("«metaclass»")).toBeVisible();
  await expect(page.locator(".react-flow__edge")).toHaveCount(1);

  const markerEnd = await page.locator(".react-flow__edge-path").first().getAttribute("marker-end");
  expect(markerEnd ?? "").toContain("ext-filled-triangle");
});

test("extension to Order shows prf.metaclass-not-a-user-class", async ({ page }) => {
  await page.goto("/");
  await openDslPanel(page);

  await page.locator('[data-testid="new-document-kind"]').selectOption("profile");
  const editor = page.locator('[data-testid="dsl-editor"]');
  await editor.click();
  await editor.fill(illegalMetaclassFixture);

  await expect(page.locator('[data-testid="diagnostics-list"]')).toContainText(
    "prf.metaclass-not-a-user-class",
    { timeout: 10_000 },
  );
});
