import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { DIAGRAM_KINDS } from "@graphiq/uml-core";
import {
  KIND_MISMATCH_RULE_ID,
  PARSE_RULE_ID,
  UNSUPPORTED_KIND_RULE_ID,
  parse,
} from "./index.js";

const fixtureDir = dirname(fileURLToPath(import.meta.url));
const orderDomainFixture = readFileSync(
  join(fixtureDir, "fixtures/class-order-domain.dsl"),
  "utf8",
);

describe("parse class diagram", () => {
  it("parses the section 5.1 fixture into classifiers and relationships", () => {
    const result = parse("class", orderDomainFixture);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected parse to succeed");
    }

    const { ast } = result.value;
    expect(ast.kind).toBe("class");
    if (ast.kind !== "class") {
      throw new Error("expected class ast");
    }
    expect(ast.name).toBe("OrderDomain");
    expect(ast.classifiers).toHaveLength(4);

    const order = ast.classifiers.find(
      (classifier) =>
        classifier.classifierKind === "class" && classifier.name === "Order",
    );
    expect(order?.classifierKind).toBe("class");
    if (order?.classifierKind !== "class") {
      throw new Error("expected Order class");
    }
    expect(order.isAbstract).toBe(false);
    expect(order.attributes).toEqual([
      expect.objectContaining({
        visibility: "private",
        name: "id",
        typeName: "UUID",
      }),
    ]);
    expect(order.operations).toEqual([
      expect.objectContaining({
        visibility: "public",
        name: "calculateTotal",
        parameters: [],
        returnType: "Float",
      }),
    ]);

    const payable = ast.classifiers.find(
      (classifier) =>
        classifier.classifierKind === "interface" && classifier.name === "Payable",
    );
    expect(payable?.classifierKind).toBe("interface");
    if (payable?.classifierKind !== "interface") {
      throw new Error("expected Payable interface");
    }
    expect(payable.operations).toEqual([
      expect.objectContaining({
        name: "pay",
        parameters: [{ name: "amount", typeName: "Money" }],
        returnType: "Boolean",
      }),
    ]);

    const documentClass = ast.classifiers.find(
      (classifier) =>
        classifier.classifierKind === "class" && classifier.name === "Document",
    );
    expect(documentClass?.classifierKind).toBe("class");
    if (documentClass?.classifierKind !== "class") {
      throw new Error("expected Document class");
    }
    expect(documentClass.isAbstract).toBe(true);

    const orderStatus = ast.classifiers.find(
      (classifier) =>
        classifier.classifierKind === "enumeration" &&
        classifier.name === "OrderStatus",
    );
    expect(orderStatus?.classifierKind).toBe("enumeration");
    if (orderStatus?.classifierKind !== "enumeration") {
      throw new Error("expected OrderStatus enum");
    }
    expect(orderStatus.literals).toEqual(["Draft", "Paid"]);

    expect(ast.relationships).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceName: "Order",
          targetName: "LineItem",
          relationshipType: "navigableAssociation",
          sourceMultiplicity: "1",
          targetMultiplicity: "*",
          name: "contains",
        }),
        expect.objectContaining({
          sourceName: "Order",
          targetName: "LineItem",
          relationshipType: "composition",
        }),
        expect.objectContaining({
          sourceName: "Order",
          targetName: "Document",
          relationshipType: "generalization",
        }),
        expect.objectContaining({
          sourceName: "Order",
          targetName: "Payable",
          relationshipType: "realization",
        }),
        expect.objectContaining({
          sourceName: "Order",
          targetName: "Mailer",
          relationshipType: "dependency",
          name: "uses",
        }),
      ]),
    );

    expect(JSON.stringify(ast)).not.toMatch(/"x"|"y"|"width"|"height"/);
  });

  it("reports dslSpan for a bad token", () => {
    const result = parse(
      "class",
      `diagram class Bad

class Broken {
  -id: UUID
  +bad@token: Float
}`,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected partial parse");
    }

    const diagnostic = result.value.diagnostics.find(
      (item) => item.ruleId === PARSE_RULE_ID,
    );
    expect(diagnostic?.dslSpan).toBeDefined();
    expect(diagnostic?.dslSpan?.start).toBeLessThan(diagnostic?.dslSpan?.end ?? 0);
  });

  it("recovers and still parses a following classifier after a broken line", () => {
    const result = parse(
      "class",
      `diagram class Recovery

class Broken {
  -id UUID
}

class Good {
  +name: String
}`,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected partial parse");
    }

    expect(result.value.diagnostics.some((item) => item.ruleId === PARSE_RULE_ID)).toBe(
      true,
    );
    if (result.value.ast.kind !== "class") {
      throw new Error("expected class ast");
    }
    expect(
      result.value.ast.classifiers.some(
        (classifier) =>
          classifier.classifierKind === "class" && classifier.name === "Good",
      ),
    ).toBe(true);
  });

  it("returns dsl.unsupported-kind for non-class diagram kinds", () => {
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

  it("reports a parse diagnostic for a foreign lifeline element", () => {
    const result = parse(
      "class",
      `diagram class Foreign

lifeline shop: Shop

class Good {}`,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected partial parse");
    }

    expect(
      result.value.diagnostics.some((item) => item.ruleId === PARSE_RULE_ID),
    ).toBe(true);
    if (result.value.ast.kind !== "class") {
      throw new Error("expected class ast");
    }
    expect(
      result.value.ast.classifiers.some(
        (classifier) =>
          classifier.classifierKind === "class" && classifier.name === "Good",
      ),
    ).toBe(true);
  });

  it("reports dsl.kind-mismatch when the header kind does not match", () => {
    const result = parse("class", "diagram useCase Store\n\nactor Customer");

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
