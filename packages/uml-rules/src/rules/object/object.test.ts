import { createId } from "@graphiq/uml-core";
import { describe, expect, it } from "vitest";
import { addElement, addRelationship, emptyModel, type UmlModel } from "@graphiq/uml-model";
import { validate } from "../../validate.js";

describe("object diagram rules", () => {
  it("warns when instance classifier is external", () => {
    const model = emptyModel("object");
    const withInstance = addElement(model, {
      elementType: "instanceSpecification",
      name: "a",
      classifierName: "Order",
    });
    if (!withInstance.ok) {
      throw new Error("expected addElement to succeed");
    }

    const diagnostics = validate("object", withInstance.value);
    expect(
      diagnostics.some((diagnostic) => diagnostic.ruleId === "object.classifier-exists"),
    ).toBe(true);
  });

  it("rejects generalization on object diagrams", () => {
    let model = emptyModel("object");
    const a = addElement(model, {
      elementType: "instanceSpecification",
      name: "a",
      classifierName: "A",
    });
    const b = addElement(a.ok ? a.value : model, {
      elementType: "instanceSpecification",
      name: "b",
      classifierName: "B",
    });
    if (!a.ok || !b.ok) {
      throw new Error("expected instances");
    }
    model = b.value;

    const aId = model.elements.find((element) => element.name === "a")?.id;
    const bId = model.elements.find((element) => element.name === "b")?.id;
    if (aId === undefined || bId === undefined) {
      throw new Error("expected ids");
    }

    const linked = addRelationship(model, {
      relationshipType: "link",
      sourceId: aId,
      targetId: bId,
    });
    if (!linked.ok) {
      throw new Error("expected link to be legal");
    }

    const modelWithGeneralization: UmlModel = {
      ...linked.value,
      relationships: [
        ...linked.value.relationships,
        {
          id: createId(),
          relationshipType: "generalization",
          sourceId: aId,
          targetId: bId,
        },
      ],
    };

    const diagnostics = validate("object", modelWithGeneralization);
    expect(
      diagnostics.some((diagnostic) => diagnostic.ruleId === "object.no-generalization"),
    ).toBe(true);
  });

  it("allows link between two instances", () => {
    let model = emptyModel("object");
    const a = addElement(model, {
      elementType: "instanceSpecification",
      name: "a",
      classifierName: "Order",
    });
    const b = addElement(a.ok ? a.value : model, {
      elementType: "instanceSpecification",
      name: "b",
      classifierName: "LineItem",
    });
    if (!a.ok || !b.ok) {
      throw new Error("expected instances");
    }
    model = b.value;

    const aId = model.elements.find((element) => element.name === "a")?.id;
    const bId = model.elements.find((element) => element.name === "b")?.id;
    if (aId === undefined || bId === undefined) {
      throw new Error("expected ids");
    }

    const linked = addRelationship(model, {
      relationshipType: "link",
      sourceId: aId,
      targetId: bId,
      name: "contains",
    });
    if (!linked.ok) {
      throw new Error("expected link to be legal");
    }

    const diagnostics = validate("object", linked.value).filter(
      (diagnostic) => diagnostic.severity === "error",
    );
    expect(
      diagnostics.some((diagnostic) => diagnostic.ruleId === "object.link-two-instances"),
    ).toBe(false);
  });
});
