import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { DIAGRAM_KINDS } from "@graphiq/uml-core";
import { KIND_MISMATCH_RULE_ID, UNSUPPORTED_KIND_RULE_ID, parse } from "./index.js";

const fixtureDir = dirname(fileURLToPath(import.meta.url));
const systemFixture = readFileSync(
  join(fixtureDir, "fixtures/package-system.dsl"),
  "utf8",
);

describe("parse package diagram", () => {
  it("parses the section 5.3 fixture into nested packages and import", () => {
    const result = parse("package", systemFixture);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected parse to succeed");
    }

    const { ast } = result.value;
    expect(ast.kind).toBe("package");
    if (ast.kind !== "package") {
      throw new Error("expected package ast");
    }

    expect(ast.name).toBe("System");
    expect(ast.packages).toHaveLength(2);

    const billing = ast.packages.find((pkg) => pkg.name === "billing");
    expect(billing?.items).toEqual([
      expect.objectContaining({
        itemKind: "classifier",
        classifier: expect.objectContaining({ classifierKind: "class", name: "Invoice" }),
      }),
    ]);

    expect(ast.relationships).toEqual([
      expect.objectContaining({
        sourceName: "billing",
        targetName: "catalog",
        relationshipType: "packageImport",
      }),
    ]);
  });

  it("maps merge stereotype to packageMerge", () => {
    const result = parse(
      "package",
      `diagram package Merge

package a {
  class A
}

package b {
  class B
}

a ..> b : «merge»
`,
    );

    expect(result.ok).toBe(true);
    if (!result.ok || result.value.ast.kind !== "package") {
      throw new Error("expected package parse");
    }

    expect(result.value.ast.relationships[0]?.relationshipType).toBe("packageMerge");
  });

  it("reports dsl.kind-mismatch when the header kind does not match", () => {
    const result = parse("package", "diagram class Order\n\nclass Order {}");

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

describe("parse unsupported kinds", () => {
  it("returns dsl.unsupported-kind for kinds without grammars", () => {
    for (const kind of DIAGRAM_KINDS) {
      if (kind === "class" || kind === "object" || kind === "package") {
        continue;
      }

      const result = parse(kind, "diagram useCase Store\n\nactor Customer");
      expect(result.ok).toBe(false);
      if (result.ok) {
        throw new Error(`expected unsupported kind for ${kind}`);
      }
      expect(result.error.diagnostics).toEqual([
        expect.objectContaining({
          ruleId: UNSUPPORTED_KIND_RULE_ID,
          message: `parse not implemented for ${kind}`,
        }),
      ]);
    }
  });
});
