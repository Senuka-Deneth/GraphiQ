import { describe, expect, it } from "vitest";
import { createId } from "@graphiq/uml-core";
import { addElement, addRelationship, emptyModel, type UmlModel } from "@graphiq/uml-model";
import { isConnectorAllowed } from "../../connectors.js";
import { STATE_MACHINE_CONNECTORS } from "../../matrices/stateMachine.js";
import { validate } from "../../validate.js";

function mustAdd(
  result: ReturnType<typeof addElement> | ReturnType<typeof addRelationship>,
): UmlModel {
  if (!result.ok) {
    throw new Error(result.error.message);
  }
  return result.value;
}

function findId(model: UmlModel, name: string): string {
  const element = model.elements.find((item) => item.name === name);
  if (element === undefined) {
    throw new Error(`expected element ${name}`);
  }
  return element.id;
}

describe("state machine diagram rules", () => {
  it("allows state-to-state transitions in the matrix", () => {
    expect(
      isConnectorAllowed({
        kind: "stateMachine",
        relationship: "transition",
        source: "state",
        target: "state",
      }),
    ).toBe(true);
    expect(STATE_MACHINE_CONNECTORS).toHaveLength(9);
  });

  it("emits sm.transition-between-vertices-of-same-machine for note endpoints", () => {
    let model = emptyModel("stateMachine");
    model = mustAdd(addElement(model, { elementType: "state", name: "Draft" }));
    model = mustAdd(addElement(model, { elementType: "note", name: "Note" }));
    model = mustAdd(
      addRelationship(model, {
        relationshipType: "transition",
        sourceId: findId(model, "Draft"),
        targetId: findId(model, "Note"),
      }),
    );

    const diagnostics = validate("stateMachine", model);
    expect(diagnostics.some((item) => item.ruleId === "rules.illegal-connector")).toBe(true);
    expect(
      diagnostics.some((item) => item.ruleId === "sm.transition-between-vertices-of-same-machine"),
    ).toBe(true);
  });

  it("emits sm.initial-one-outgoing-no-trigger when initial has two outgoing transitions", () => {
    let model = emptyModel("stateMachine");
    model = mustAdd(
      addElement(model, { elementType: "pseudostate", name: "[*]", kind: "initial" }),
    );
    model = mustAdd(addElement(model, { elementType: "state", name: "Draft" }));
    model = mustAdd(addElement(model, { elementType: "state", name: "Paid" }));
    const initialId = findId(model, "[*]");
    model = mustAdd(
      addRelationship(model, {
        relationshipType: "transition",
        sourceId: initialId,
        targetId: findId(model, "Draft"),
      }),
    );
    model = mustAdd(
      addRelationship(model, {
        relationshipType: "transition",
        sourceId: initialId,
        targetId: findId(model, "Paid"),
      }),
    );

    const diagnostics = validate("stateMachine", model);
    expect(
      diagnostics.some((item) => item.ruleId === "sm.initial-one-outgoing-no-trigger"),
    ).toBe(true);
  });

  it("emits sm.initial-one-outgoing-no-trigger when initial transition has a trigger", () => {
    let model = emptyModel("stateMachine");
    model = mustAdd(
      addElement(model, { elementType: "pseudostate", name: "[*]", kind: "initial" }),
    );
    model = mustAdd(addElement(model, { elementType: "state", name: "Draft" }));
    model = mustAdd(
      addRelationship(model, {
        relationshipType: "transition",
        sourceId: findId(model, "[*]"),
        targetId: findId(model, "Draft"),
        trigger: "start",
      }),
    );

    const diagnostics = validate("stateMachine", model);
    expect(
      diagnostics.some((item) => item.ruleId === "sm.initial-one-outgoing-no-trigger"),
    ).toBe(true);
  });

  it("emits sm.final-no-outgoing when a final state has an outgoing transition", () => {
    let model = emptyModel("stateMachine");
    model = mustAdd(addElement(model, { elementType: "state", name: "Paid" }));
    model = mustAdd(addElement(model, { elementType: "finalState", name: "[*]" }));
    model = mustAdd(
      addRelationship(model, {
        relationshipType: "transition",
        sourceId: findId(model, "[*]"),
        targetId: findId(model, "Paid"),
      }),
    );

    const diagnostics = validate("stateMachine", model);
    expect(diagnostics.some((item) => item.ruleId === "sm.final-no-outgoing")).toBe(true);
  });

  it("emits sm.composite-has-region for a forged composite without a region", () => {
    const parentId = createId();
    const childId = createId();
    const model: UmlModel = {
      ...emptyModel("stateMachine"),
      elements: [
        { id: parentId, elementType: "state", name: "Checkout" },
        { id: childId, elementType: "state", name: "Nested", parentId },
      ],
    };

    const diagnostics = validate("stateMachine", model);
    expect(diagnostics.some((item) => item.ruleId === "sm.composite-has-region")).toBe(true);
  });

  it("emits sm.no-class-operations-as-states for a forged class element", () => {
    const model: UmlModel = {
      ...emptyModel("stateMachine"),
      elements: [
        {
          id: createId(),
          elementType: "class",
          name: "Order",
          isAbstract: false,
          attributes: [],
          operations: [],
        },
      ],
    };

    const diagnostics = validate("stateMachine", model);
    expect(
      diagnostics.some((item) => item.ruleId === "sm.no-class-operations-as-states"),
    ).toBe(true);
    expect(diagnostics.some((item) => item.ruleId === "rules.illegal-element-on-diagram")).toBe(
      true,
    );
  });
});
