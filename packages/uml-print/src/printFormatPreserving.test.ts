import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { buildClassSourceMap, parse } from "@graphiq/uml-dsl";
import { addElement, renameElement } from "@graphiq/uml-model";
import { classAstToModel } from "./classAstToModel.js";
import { print } from "./print.js";

const fixtureDir = dirname(fileURLToPath(import.meta.url));
const formatPreservingFixture = readFileSync(
  join(fixtureDir, "../../uml-dsl/src/fixtures/class-format-preserving.dsl"),
  "utf8",
);

function parseClassSource(text: string) {
  const parseResult = parse("class", text);
  expect(parseResult.ok).toBe(true);
  if (!parseResult.ok) {
    throw new Error("expected parse to succeed");
  }
  if (parseResult.value.ast.kind !== "class") {
    throw new Error("expected class ast");
  }
  return {
    ast: parseResult.value.ast,
    comments: parseResult.value.comments,
    text,
  };
}

describe("print class diagram with source preservation", () => {
  it("preserves comments and whitespace when renaming on canvas", () => {
    const source = parseClassSource(formatPreservingFixture);
    const model = classAstToModel(source.ast);
    const order = model.elements.find((element) => element.name === "Order");
    expect(order).toBeDefined();
    if (order === undefined) {
      throw new Error("expected Order element");
    }

    const renamed = renameElement(model, order.id, "PurchaseOrder");
    expect(renamed.ok).toBe(true);
    if (!renamed.ok) {
      throw new Error("expected rename to succeed");
    }

    const printed = print("class", renamed.value, {
      name: "FormatPreserve",
      source,
    });

    expect(printed).toContain("// attached to Order");
    expect(printed).toContain("class PurchaseOrder {");
    expect(printed).toContain("\n\n  +calculateTotal(): Float");
    expect(printed).toContain("interface Payable {");
    expect(printed).toContain("+pay(amount: Money): Boolean");
    expect(printed).toContain("PurchaseOrder --|> Document");
    expect(JSON.stringify(printed)).not.toMatch(/"x"|"y"|"width"|"height"/);
  });

  it("preserves unrelated class body whitespace when adding a class", () => {
    const source = parseClassSource(formatPreservingFixture);
    const model = classAstToModel(source.ast);
    const added = addElement(model, { elementType: "class", name: "Invoice" });
    expect(added.ok).toBe(true);
    if (!added.ok) {
      throw new Error("expected addElement to succeed");
    }

    const printed = print("class", added.value, {
      name: "FormatPreserve",
      source,
    });

    expect(printed).toContain("// attached to Order");
    expect(printed).toContain("\n\n  +calculateTotal(): Float");
    expect(printed).toContain("class Invoice");
    expect(printed).toContain("interface Payable {");
    expect(JSON.stringify(printed)).not.toMatch(/"x"|"y"|"width"|"height"/);
  });

  it("builds a class source map with comments attached to declarations", () => {
    const source = parseClassSource(formatPreservingFixture);
    const sourceMap = buildClassSourceMap(source.text, source.ast, source.comments);
    const orderChunk = sourceMap.classifiers.find(
      (chunk) => chunk.classifier.name === "Order",
    );
    expect(orderChunk).toBeDefined();
    if (orderChunk === undefined) {
      throw new Error("expected Order chunk");
    }
    expect(orderChunk.leadingComments.some((comment) => comment.image.includes("attached to Order"))).toBe(
      true,
    );
    expect(sourceMap.headerLeadingComments).toHaveLength(0);
  });
});
