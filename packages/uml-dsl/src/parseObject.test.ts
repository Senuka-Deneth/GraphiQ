import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { DIAGRAM_KINDS } from "@graphiq/uml-core";
import { KIND_MISMATCH_RULE_ID, PARSE_RULE_ID, UNSUPPORTED_KIND_RULE_ID, parse } from "./index.js";

const fixtureDir = dirname(fileURLToPath(import.meta.url));
const checkoutFixture = readFileSync(
  join(fixtureDir, "fixtures/object-checkout.dsl"),
  "utf8",
);

describe("parse object diagram", () => {
  it("parses the section 5.2 fixture into instances and links", () => {
    const result = parse("object", checkoutFixture);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected parse to succeed");
    }

    const { ast } = result.value;
    expect(ast.kind).toBe("object");
    if (ast.kind !== "object") {
      throw new Error("expected object ast");
    }

    expect(ast.name).toBe("CheckoutSnapshot");
    expect(ast.instances).toHaveLength(2);

    const orderInstance = ast.instances.find((instance) => instance.name === "a");
    expect(orderInstance?.classifierName).toBe("Order");
    expect(orderInstance?.slots).toEqual([
      expect.objectContaining({ featureName: "id", value: "o-1" }),
      expect.objectContaining({ featureName: "status", value: "Paid" }),
    ]);

    expect(ast.relationships).toEqual([
      expect.objectContaining({
        sourceName: "a",
        targetName: "b",
        relationshipType: "link",
        name: "contains",
      }),
    ]);
  });

  it("recovers and parses a second instance after a broken line", () => {
    const result = parse(
      "object",
      `diagram object Recovery

instance good: Order

instance bad @@@ broken

instance recovered: LineItem
`,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected partial parse");
    }

    expect(result.value.diagnostics.some((item) => item.ruleId === PARSE_RULE_ID)).toBe(true);
    if (result.value.ast.kind !== "object") {
      throw new Error("expected object ast");
    }
    expect(result.value.ast.instances.map((instance) => instance.name)).toEqual([
      "good",
      "recovered",
    ]);
  });

  it("reports dsl.kind-mismatch when the header kind does not match", () => {
    const result = parse("object", "diagram class Order\n\nclass Order {}");

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
      if (
        kind === "class" ||
        kind === "object" ||
        kind === "package" ||
        kind === "component" ||
        kind === "deployment" ||
        kind === "profile" ||
        kind === "useCase" ||
        kind === "compositeStructure"
      ) {
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
