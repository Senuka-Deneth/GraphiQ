import { expect, test } from "@playwright/test";
import { DIAGRAM_KINDS } from "@graphiq/uml-core";
import { readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openDslPanel, waitForPersistReady } from "./helpers.js";

const CLASS_IMPORT_DSL = `diagram class ImportE2E

class Alpha {
}

class Beta {
}

Alpha --|> Beta
`;

const ACTIVITY_IMPORT_DSL = `diagram activity ImportKindSwitch

initial --> final
`;

test("download DSL guide saves graphiq-dsl-guide.md with all kind headers", async ({ page }) => {
  await page.goto("/");
  await waitForPersistReady(page);

  const download = page.waitForEvent("download");
  await page.locator('[data-testid="download-dsl-guide"]').click();
  const file = await download;
  expect(file.suggestedFilename()).toBe("graphiq-dsl-guide.md");

  const path = await file.path();
  expect(path).not.toBeNull();
  if (path === null) {
    throw new Error("expected download path");
  }

  const contents = readFileSync(path, "utf8");
  for (const kind of DIAGRAM_KINDS) {
    expect(contents).toContain(`diagram ${kind}`);
  }
});

test("import DSL loads a class fixture into the editor and canvas", async ({ page }) => {
  await page.goto("/");
  await waitForPersistReady(page);

  const fixturePath = join(tmpdir(), `graphiq-import-${Date.now()}.dsl`);
  writeFileSync(fixturePath, CLASS_IMPORT_DSL, "utf8");

  await page.locator('[data-testid="import-dsl-input"]').setInputFiles(fixturePath);
  await expect(page.locator(".react-flow__node")).toHaveCount(2, { timeout: 10_000 });

  await openDslPanel(page);
  const editor = page.locator('[data-testid="dsl-editor"]');
  await expect(editor).toContainText("Alpha");
  await expect(editor).toContainText("Beta");
  await expect(editor).toContainText("--|>");
});

test("import DSL switches document kind when the fixture kind differs", async ({ page }) => {
  await page.goto("/");
  await waitForPersistReady(page);

  const fixturePath = join(tmpdir(), `graphiq-import-activity-${Date.now()}.dsl`);
  writeFileSync(fixturePath, ACTIVITY_IMPORT_DSL, "utf8");

  await page.locator('[data-testid="import-dsl-input"]').setInputFiles(fixturePath);
  await expect(page.locator('[data-testid="document-kind-badge"]')).toHaveText("activity", {
    timeout: 10_000,
  });
  await expect(page.locator('[data-testid="activity-canvas"]')).toBeVisible();
});

test("importing Mermaid classDiagram does not create GraphiQ class nodes", async ({ page }) => {
  await page.goto("/");
  await waitForPersistReady(page);

  const fixturePath = join(tmpdir(), `graphiq-import-mermaid-${Date.now()}.md`);
  writeFileSync(
    fixturePath,
    `classDiagram
  Alpha --> Beta
`,
    "utf8",
  );

  await page.locator('[data-testid="import-dsl-input"]').setInputFiles(fixturePath);
  await expect(page.locator('[data-testid="diagnostics-list"]')).toContainText(
    "dsl.import-no-diagram",
    { timeout: 10_000 },
  );
  await expect(page.locator(".react-flow__node")).toHaveCount(0);

  await openDslPanel(page);
  const editor = page.locator('[data-testid="dsl-editor"]');
  await expect(editor).toContainText("diagram class");
  await expect(editor).not.toContainText("Alpha");
});
