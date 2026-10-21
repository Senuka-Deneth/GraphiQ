import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";
import { openDslPanel } from "./helpers.js";

const devInsight = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "../../../packages/uml-dsl/src/fixtures/sequence-markup-devinsight.puml"),
  "utf8",
);

const markup = `@startuml
title Checkout
actor Customer
participant Shop
Customer -> Shop : placeOrder()
activate Shop
Shop --> Customer : ok
deactivate Shop
alt in stock
  Shop -> Shop : pack
else sold out
  Shop -> Customer : sorry
end
@enduml
`;

test("pasted sequence markup renders and downloads as code", async ({ page }) => {
  await page.goto("/");
  await openDslPanel(page);

  const editor = page.locator('[data-testid="dsl-editor"]');
  await editor.click();
  await editor.fill(markup);
  await page.getByTestId("submit-dsl").click();

  await expect(page.getByTestId("lifeline-name").filter({ hasText: "Customer" })).toBeVisible({
    timeout: 10_000,
  });
  await expect(page.getByTestId("lifeline-name").filter({ hasText: "Shop" })).toBeVisible();
  await expect(page.locator('[data-testid="combined-fragment"]')).toBeVisible();
  await expect(page.locator('[data-head="actor"]')).toBeVisible();
  await expect(page.locator('[data-testid="sequence-message"]')).toHaveCount(4);

  const pending = page.waitForEvent("download");
  await page.getByTestId("download-diagram-code").click();
  const file = await pending;
  expect(file.suggestedFilename()).toBe("Checkout.puml");
  const path = await file.path();
  if (path === null) {
    throw new Error("expected download path");
  }
  const body = readFileSync(path, "utf8");
  expect(body).toContain("@startuml");
  expect(body).toContain("actor Customer");
  expect(body).toContain("alt in stock");
  expect(body).toContain("Shop");
});

test("DevInsight markup renders participants, a note, and no rule errors", async ({ page }) => {
  await page.goto("/");
  await openDslPanel(page);
  const editor = page.locator('[data-testid="dsl-editor"]');
  await editor.click();
  await editor.fill(devInsight);
  await page.getByTestId("submit-dsl").click();

  await expect(page.getByTestId("lifeline-name").filter({ hasText: "Developer" })).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByTestId("lifeline-name").filter({ hasText: "PostgreSQL" })).toBeVisible();
  await expect(page.getByTestId("sequence-note").filter({ hasText: "06:00 Colombo" })).toBeVisible();
  await expect(page.locator('[data-testid="combined-fragment"]')).toHaveCount(12);
  await expect(page.locator('[data-severity="error"]')).toHaveCount(0);
});
