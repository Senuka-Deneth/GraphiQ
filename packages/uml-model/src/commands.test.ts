import { describe, expect, it } from "vitest";
import { addElement, addRelationship, removeElement, renameElement, setClassAttribute } from "./commands.js";
import { emptyModel } from "./model.js";

describe("emptyModel", () => {
  it("creates an empty class model", () => {
    const model = emptyModel("class");
    expect(model.kind).toBe("class");
    expect(model.elements).toEqual([]);
    expect(model.relationships).toEqual([]);
    expect(model.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });
});

describe("addElement", () => {
  it("adds a class to a class model with defaults", () => {
    const model = emptyModel("class");
    const result = addElement(model, { elementType: "class", name: "Order" });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected addElement to succeed");
    }

    expect(result.value.elements).toHaveLength(1);
    const element = result.value.elements[0];
    expect(element?.elementType).toBe("class");
    if (element?.elementType !== "class") {
      throw new Error("expected class element");
    }
    expect(element.name).toBe("Order");
    expect(element.isAbstract).toBe(false);
    expect(element.attributes).toEqual([]);
    expect(element.operations).toEqual([]);
    expect(element.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  it("rejects a lifeline on a class model without mutating the input", () => {
    const model = emptyModel("class");
    const result = addElement(model, { elementType: "lifeline", name: "shop" });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected addElement to fail");
    }
    expect(result.error.code).toBe("illegal-element-on-diagram");
    expect(model.elements).toEqual([]);
  });

  it("rejects a class on a sequence model", () => {
    const model = emptyModel("sequence");
    const result = addElement(model, { elementType: "class", name: "Order" });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected addElement to fail");
    }
    expect(result.error.code).toBe("illegal-element-on-diagram");
  });
});

describe("addRelationship", () => {
  it("rejects a message on a class model without mutating the input", () => {
    const model = emptyModel("class");
    const withClass = addElement(model, { elementType: "class", name: "A" });
    const withSecondClass = addElement(
      withClass.ok ? withClass.value : model,
      { elementType: "class", name: "B" },
    );

    if (!withSecondClass.ok) {
      throw new Error("expected class elements to be added");
    }

    const sourceId = withSecondClass.value.elements[0]?.id;
    const targetId = withSecondClass.value.elements[1]?.id;
    if (!sourceId || !targetId) {
      throw new Error("expected two class ids");
    }

    const before = withSecondClass.value;
    const result = addRelationship(before, {
      relationshipType: "message",
      sourceId,
      targetId,
      messageSort: "synchCall",
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected addRelationship to fail");
    }
    expect(result.error.code).toBe("illegal-relationship-on-diagram");
    expect(before.relationships).toEqual([]);
  });

  it("creates an association with default multiplicities", () => {
    let model = emptyModel("class");

    const first = addElement(model, { elementType: "class", name: "Order" });
    if (!first.ok) {
      throw new Error("expected first class to be added");
    }
    model = first.value;

    const second = addElement(model, { elementType: "class", name: "LineItem" });
    if (!second.ok) {
      throw new Error("expected second class to be added");
    }
    model = second.value;

    const sourceId = model.elements[0]?.id;
    const targetId = model.elements[1]?.id;
    if (!sourceId || !targetId) {
      throw new Error("expected class ids");
    }

    const result = addRelationship(model, {
      relationshipType: "association",
      sourceId,
      targetId,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected association to be added");
    }

    const relationship = result.value.relationships[0];
    expect(relationship?.relationshipType).toBe("association");
    if (relationship?.relationshipType !== "association") {
      throw new Error("expected association relationship");
    }
    expect(relationship.sourceMultiplicity).toBe("1");
    expect(relationship.targetMultiplicity).toBe("1");
  });
});

describe("removeElement", () => {
  it("removes incident relationships", () => {
    let model = emptyModel("class");

    const first = addElement(model, { elementType: "class", name: "A" });
    const second = addElement(first.ok ? first.value : model, {
      elementType: "class",
      name: "B",
    });
    if (!first.ok || !second.ok) {
      throw new Error("expected classes to be added");
    }
    model = second.value;

    const sourceId = model.elements[0]?.id;
    const targetId = model.elements[1]?.id;
    if (!sourceId || !targetId) {
      throw new Error("expected class ids");
    }

    const withRelationship = addRelationship(model, {
      relationshipType: "generalization",
      sourceId,
      targetId,
    });
    if (!withRelationship.ok) {
      throw new Error("expected generalization to be added");
    }
    model = withRelationship.value;
    expect(model.relationships).toHaveLength(1);

    const removed = removeElement(model, sourceId);
    expect(removed.ok).toBe(true);
    if (!removed.ok) {
      throw new Error("expected removeElement to succeed");
    }
    expect(removed.value.elements).toHaveLength(1);
    expect(removed.value.relationships).toHaveLength(0);
  });
});

describe("renameElement", () => {
  it("renames a class without changing its id", () => {
    let model = emptyModel("class");
    const added = addElement(model, { elementType: "class", name: "Order" });
    expect(added.ok).toBe(true);
    if (!added.ok) {
      throw new Error("expected addElement to succeed");
    }
    model = added.value;
    const classId = model.elements[0]?.id;
    expect(classId).toBeDefined();

    const renamed = renameElement(model, classId!, "PurchaseOrder");
    expect(renamed.ok).toBe(true);
    if (!renamed.ok) {
      throw new Error("expected renameElement to succeed");
    }

    const element = renamed.value.elements[0];
    expect(element?.name).toBe("PurchaseOrder");
    expect(element?.id).toBe(classId);
  });
});

describe("setClassAttribute", () => {
  it("updates an attribute while preserving its id", () => {
    let model = emptyModel("class");
    const added = addElement(model, {
      elementType: "class",
      name: "Order",
      attributes: [{ id: "attr-1", visibility: "private", name: "id", typeName: "UUID" }],
    });
    expect(added.ok).toBe(true);
    if (!added.ok) {
      throw new Error("expected addElement to succeed");
    }
    model = added.value;
    const classId = model.elements[0]?.id;
    if (classId === undefined || model.elements[0]?.elementType !== "class") {
      throw new Error("expected class element");
    }

    const updated = setClassAttribute(model, classId, "attr-1", {
      id: "attr-1",
      visibility: "public",
      name: "orderId",
      typeName: "UUID",
    });
    expect(updated.ok).toBe(true);
    if (!updated.ok) {
      throw new Error("expected setClassAttribute to succeed");
    }

    const element = updated.value.elements[0];
    if (element?.elementType !== "class") {
      throw new Error("expected class element");
    }
    expect(element.attributes[0]).toEqual({
      id: "attr-1",
      visibility: "public",
      name: "orderId",
      typeName: "UUID",
    });
  });
});
