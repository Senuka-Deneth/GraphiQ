import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { openDslPanel } from "./helpers.js";

const markup = `@startuml
title OrderDomain
class Order {
  -id: UUID
}
interface Payable
class Document
class Mailer
Document <|-- Order
Order --> Mailer : uses
@enduml
`;

test("pasted PlantUML class markup renders and downloads as code", async ({ page }) => {
  await page.goto("/");
  await openDslPanel(page);
  const editor = page.locator('[data-testid="dsl-editor"]');
  await editor.click();
  await editor.fill(markup);
  await page.getByTestId("submit-dsl").click();

  await expect(page.getByText("Order", { exact: true }).first()).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText("Payable", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Mailer", { exact: true }).first()).toBeVisible();
  await expect(page.locator('[data-testid="document-kind-badge"]')).toHaveText("class");

  const pending = page.waitForEvent("download");
  await page.getByTestId("download-diagram-code").click();
  const file = await pending;
  expect(file.suggestedFilename()).toBe("OrderDomain.puml");
  const path = await file.path();
  if (path === null) {
    throw new Error("expected download path");
  }
  const body = readFileSync(path, "utf8");
  expect(body).toContain("@startuml");
  expect(body).toContain("class Order");
  expect(body).toContain("Payable");
  expect(body).toContain("Mailer");
});
