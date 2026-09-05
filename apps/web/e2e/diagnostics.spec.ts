import { expect, test } from "@playwright/test";
import { openDslPanel } from "./helpers.js";

const ILLEGAL_GENERALIZATION_DSL = `diagram class

class A {
}

interface B {
}

A --|> B
`;

const BROKEN_TOKEN_DSL = `diagram class

class Good {
}

class Bad @@@ {
}

class Recovered {
}
`;

test("illegal DSL relationship shows rule id and marks the edge", async ({ page }) => {
  await page.goto("/");
  await openDslPanel(page);

  const editor = page.locator('[data-testid="dsl-editor"]');
  await editor.click();
  await editor.fill(ILLEGAL_GENERALIZATION_DSL);

  await expect(page.locator('[data-testid="diagnostics-list"]')).toContainText(
    /class\.gen\.same-metaclass|rules\.illegal-connector/,
    { timeout: 10_000 },
  );

  await expect(page.locator(".react-flow__edge")).toHaveCount(1);
  await expect(page.locator(".react-flow__edge.graphiq-diagnostic-error")).toHaveCount(1);
});

test("parse error squiggles the line and keeps the last good canvas", async ({ page }) => {
  await page.goto("/");
  await openDslPanel(page);

  const editor = page.locator('[data-testid="dsl-editor"]');
  await editor.click();
  await editor.fill(`diagram class

class Stable {
}
`);

  await expect(page.locator(".react-flow__node")).toHaveCount(1, { timeout: 10_000 });

  await editor.fill(BROKEN_TOKEN_DSL);

  await expect(page.locator(".cm-lintRange-error, .cm-lintRange-warning")).toHaveCount(
    1,
    { timeout: 10_000 },
  );
  await expect(page.locator('[data-testid="diagnostics-list"]')).toContainText("dsl.parse");

  await expect(page.locator(".react-flow__node")).toHaveCount(1);
  await expect(page.locator(".react-flow__node")).toContainText("Stable");
});
