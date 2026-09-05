import { emptyOverlay, layoutDocument } from "@graphiq/uml-layout";
import { addElement, emptyModel } from "@graphiq/uml-model";
import { astToModel } from "@graphiq/uml-print";
import { parse } from "@graphiq/uml-dsl";
import { describe, expect, it } from "vitest";
import { serializeDiagramSvg } from "./serializeDiagramSvg.js";
import type { GraphiqDocument } from "../store/documentStore.js";

const CLASS_GENERALIZATION_DSL = `diagram class ExportFixture

class A {
}

class B {
}

A --|> B
`;

describe("serializeDiagramSvg", () => {
  it("includes class names and marker ids without DSL coordinates", async () => {
    const parseResult = parse("class", CLASS_GENERALIZATION_DSL);
    expect(parseResult.ok).toBe(true);
    if (!parseResult.ok || parseResult.value.ast.kind !== "class") {
      throw new Error("expected class parse");
    }

    const model = astToModel(parseResult.value.ast, emptyModel("class"));
    const overlay = await layoutDocument(
      "class",
      model,
      emptyOverlay(),
      "first-open-empty-overlay",
    );

    const document: GraphiqDocument = {
      id: "export-doc",
      kind: "class",
      title: "ExportFixture",
      model,
      overlay,
      dsl: CLASS_GENERALIZATION_DSL,
    };

    const svg = serializeDiagramSvg(document);
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(svg).toContain("A");
    expect(svg).toContain("B");
    expect(svg).toContain('id="gen-hollow-triangle"');
    expect(svg).toContain('stroke="#0f172a"');
    expect(svg).not.toContain("currentColor");
    expect(svg).not.toContain("diagram class");
    expect(svg).not.toMatch(/\bx:\s*\d+/);
  });

  it("renders a standalone sequence diagram from overlay geometry", async () => {
    let model = emptyModel("sequence");
    const customer = addElement(model, {
      elementType: "lifeline",
      name: "customer",
      classifierName: "Actor",
    });
    expect(customer.ok).toBe(true);
    if (!customer.ok) {
      throw new Error("expected lifeline");
    }
    model = customer.value;
    const shop = addElement(model, {
      elementType: "lifeline",
      name: "shop",
      classifierName: "Shop",
    });
    expect(shop.ok).toBe(true);
    if (!shop.ok) {
      throw new Error("expected lifeline");
    }
    model = shop.value;

    const overlay = await layoutDocument("sequence", model, emptyOverlay(), "first-open-empty-overlay");
    const document: GraphiqDocument = {
      id: "seq-export",
      kind: "sequence",
      title: "SequenceExport",
      model,
      overlay,
      dsl: "diagram sequence\n",
    };

    const svg = serializeDiagramSvg(document);
    expect(svg).toContain("customer: Actor");
    expect(svg).toContain("shop: Shop");
    expect(svg).toContain('id="msg-sync-filled"');
  });
});
