import { describe, expect, it } from "vitest";
import { addElement, addRelationship, emptyModel } from "@graphiq/uml-model";
import { isConnectorAllowed } from "../../connectors.js";
import { validate } from "../../validate.js";
import { isProfileMetaclassName } from "./metaclasses.js";

describe("profile diagram rules", () => {
  it("allows extension from a stereotype to Class", () => {
    let model = emptyModel("profile");
    const entity = addElement(model, { elementType: "stereotype", name: "Entity" });
    const metaclass = addElement(entity.ok ? entity.value : model, {
      elementType: "metaclass",
      name: "Class",
    });
    if (!entity.ok || !metaclass.ok) {
      throw new Error("expected stereotype and metaclass");
    }
    model = metaclass.value;
    const sourceId = model.elements.find((element) => element.name === "Entity")?.id;
    const targetId = model.elements.find((element) => element.name === "Class")?.id;
    if (sourceId === undefined || targetId === undefined) {
      throw new Error("expected ids");
    }

    const extension = addRelationship(model, {
      relationshipType: "extension",
      sourceId,
      targetId,
    });
    if (!extension.ok) {
      throw new Error("expected extension");
    }

    expect(validate("profile", extension.value)).toEqual([]);
  });

  it("reports prf.metaclass-not-a-user-class for Order", () => {
    let model = emptyModel("profile");
    const entity = addElement(model, { elementType: "stereotype", name: "Entity" });
    const order = addElement(entity.ok ? entity.value : model, {
      elementType: "metaclass",
      name: "Order",
    });
    if (!entity.ok || !order.ok) {
      throw new Error("expected elements");
    }
    model = order.value;
    const sourceId = model.elements.find((element) => element.name === "Entity")?.id;
    const targetId = model.elements.find((element) => element.name === "Order")?.id;
    if (sourceId === undefined || targetId === undefined) {
      throw new Error("expected ids");
    }

    const extension = addRelationship(model, {
      relationshipType: "extension",
      sourceId,
      targetId,
    });
    if (!extension.ok) {
      throw new Error("expected extension");
    }

    const diagnostics = validate("profile", extension.value);
    expect(diagnostics.some((diagnostic) => diagnostic.ruleId === "prf.metaclass-not-a-user-class")).toBe(
      true,
    );
  });

  it("treats Class as a legal metaclass name and Order as a user class", () => {
    expect(isProfileMetaclassName("Class")).toBe(true);
    expect(isProfileMetaclassName("Order")).toBe(false);
    expect(
      isConnectorAllowed({
        kind: "profile",
        relationship: "extension",
        source: "stereotype",
        target: "metaclass",
      }),
    ).toBe(true);
  });
});
