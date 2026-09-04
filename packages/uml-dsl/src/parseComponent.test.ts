import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { KIND_MISMATCH_RULE_ID, PARSE_RULE_ID, parse } from "./index.js";

const fixtureDir = dirname(fileURLToPath(import.meta.url));
const shopFixture = readFileSync(join(fixtureDir, "fixtures/component-shop.dsl"), "utf8");

describe("parse component diagram", () => {
  it("parses the section 5.5 fixture into components, provides, requires, and assembly", () => {
    const result = parse("component", shopFixture);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected parse to succeed");
    }

    const { ast } = result.value;
    expect(ast.kind).toBe("component");
    if (ast.kind !== "component") {
      throw new Error("expected component ast");
    }

    expect(ast.name).toBe("Shop");
    expect(ast.components).toHaveLength(2);

    const payments = ast.components.find((component) => component.name === "Payments");
    expect(payments?.items).toEqual([
      expect.objectContaining({ itemKind: "provides", name: "Billing" }),
      expect.objectContaining({ itemKind: "requires", name: "Ledger" }),
    ]);

    const accounting = ast.components.find((component) => component.name === "Accounting");
    expect(accounting?.items).toEqual([
      expect.objectContaining({ itemKind: "provides", name: "Ledger" }),
    ]);

    expect(ast.relationships).toEqual([
      expect.objectContaining({
        relationshipKind: "assembly",
        sourceComponentName: "Payments",
        sourceInterfaceName: "Ledger",
        targetInterfaceName: "Ledger",
        targetComponentName: "Accounting",
      }),
    ]);
  });

  it("recovers and parses a second component after a broken line", () => {
    const result = parse(
      "component",
      `diagram component Recovery

component Good {
  provides Billing
}

component @@@ broken

component Recovered {
  requires Ledger
}
`,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected partial parse");
    }

    expect(result.value.diagnostics.some((item) => item.ruleId === PARSE_RULE_ID)).toBe(true);
    if (result.value.ast.kind !== "component") {
      throw new Error("expected component ast");
    }
    expect(result.value.ast.components.map((component) => component.name)).toContain("Good");
    expect(result.value.ast.components.map((component) => component.name)).toContain(
      "Recovered",
    );
  });

  it("reports dsl.kind-mismatch when the header kind does not match", () => {
    const result = parse("component", "diagram class Order\n\nclass Order {}");

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected kind mismatch failure");
    }

    expect(result.error.diagnostics).toEqual([
      expect.objectContaining({
        ruleId: KIND_MISMATCH_RULE_ID,
      }),
    ]);
  });
});
