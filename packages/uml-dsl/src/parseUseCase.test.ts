import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { KIND_MISMATCH_RULE_ID, PARSE_RULE_ID, parse } from "./index.js";

const fixtureDir = dirname(fileURLToPath(import.meta.url));
const storefrontFixture = readFileSync(
  join(fixtureDir, "fixtures/usecase-storefront.dsl"),
  "utf8",
);

describe("parse use case diagram", () => {
  it("parses the section 5.8 fixture into actors, a subject, and relationships", () => {
    const result = parse("useCase", storefrontFixture);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected parse to succeed");
    }

    const { ast } = result.value;
    expect(ast.kind).toBe("useCase");
    if (ast.kind !== "useCase") {
      throw new Error("expected use case ast");
    }

    expect(ast.name).toBe("Storefront");
    expect(ast.actors.map((item) => item.name)).toEqual(["Customer", "Clerk"]);
    expect(ast.subjects).toEqual([
      expect.objectContaining({
        name: "Shop",
        useCases: [
          expect.objectContaining({ name: "Checkout" }),
          expect.objectContaining({ name: "Pay" }),
          expect.objectContaining({ name: "Refund" }),
        ],
      }),
    ]);
    expect(ast.relationships).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceName: "Checkout",
          targetName: "Pay",
          relationshipType: "include",
        }),
        expect.objectContaining({
          sourceName: "Refund",
          targetName: "Checkout",
          relationshipType: "extend",
        }),
      ]),
    );
  });

  it("recovers and parses a second actor after a broken line", () => {
    const result = parse(
      "useCase",
      `diagram useCase Recovery

actor Good

actor @@@ broken

actor Recovered
`,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected partial parse");
    }

    expect(result.value.diagnostics.some((item) => item.ruleId === PARSE_RULE_ID)).toBe(true);
    if (result.value.ast.kind !== "useCase") {
      throw new Error("expected use case ast");
    }
    expect(result.value.ast.actors.map((item) => item.name)).toContain("Good");
    expect(result.value.ast.actors.map((item) => item.name)).toContain("Recovered");
  });

  it("reports dsl.kind-mismatch when the header kind does not match", () => {
    const result = parse("useCase", "diagram class Order\n\nclass Order {}");

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
