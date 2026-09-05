import { describe, expect, it } from "vitest";
import { createId } from "@graphiq/uml-core";
import { addElement, addRelationship, emptyModel, type UmlModel } from "@graphiq/uml-model";
import { isConnectorAllowed } from "../../connectors.js";
import { ACTIVITY_CONNECTORS } from "../../matrices/activity.js";
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

describe("activity diagram rules", () => {
  it("allows control flow between actions in the matrix", () => {
    expect(
      isConnectorAllowed({
        kind: "activity",
        relationship: "controlFlow",
        source: "action",
        target: "action",
      }),
    ).toBe(true);
    expect(ACTIVITY_CONNECTORS.length).toBeGreaterThan(0);
  });

  it("emits act.flow-from-executable-or-control-node for control flow from an object node", () => {
    let model = emptyModel("activity");
    model = mustAdd(addElement(model, { elementType: "objectNode", name: "Invoice" }));
    model = mustAdd(addElement(model, { elementType: "action", name: "Pack" }));
    model = mustAdd(
      addRelationship(model, {
        relationshipType: "controlFlow",
        sourceId: findId(model, "Invoice"),
        targetId: findId(model, "Pack"),
      }),
    );

    const diagnostics = validate("activity", model);
    expect(diagnostics.some((item) => item.ruleId === "rules.illegal-connector")).toBe(true);
    expect(
      diagnostics.some((item) => item.ruleId === "act.flow-from-executable-or-control-node"),
    ).toBe(true);
  });

  it("emits act.initial-no-incoming when an initial node has an incoming flow", () => {
    let model = emptyModel("activity");
    model = mustAdd(addElement(model, { elementType: "action", name: "ReceiveOrder" }));
    model = mustAdd(addElement(model, { elementType: "initialNode", name: "initial" }));
    model = mustAdd(
      addRelationship(model, {
        relationshipType: "controlFlow",
        sourceId: findId(model, "ReceiveOrder"),
        targetId: findId(model, "initial"),
      }),
    );

    const diagnostics = validate("activity", model);
    expect(diagnostics.some((item) => item.ruleId === "act.initial-no-incoming")).toBe(true);
  });

  it("emits act.final-no-outgoing when a final node has an outgoing flow", () => {
    let model = emptyModel("activity");
    model = mustAdd(addElement(model, { elementType: "action", name: "Ship" }));
    model = mustAdd(addElement(model, { elementType: "activityFinalNode", name: "final" }));
    model = mustAdd(
      addRelationship(model, {
        relationshipType: "controlFlow",
        sourceId: findId(model, "final"),
        targetId: findId(model, "Ship"),
      }),
    );

    const diagnostics = validate("activity", model);
    expect(diagnostics.some((item) => item.ruleId === "act.final-no-outgoing")).toBe(true);
  });

  it("warns act.decision-has-guards-on-outgoing when a decision outgoing flow has no guard", () => {
    let model = emptyModel("activity");
    model = mustAdd(addElement(model, { elementType: "decisionNode", name: "CheckStock" }));
    model = mustAdd(addElement(model, { elementType: "action", name: "Pack" }));
    model = mustAdd(
      addRelationship(model, {
        relationshipType: "controlFlow",
        sourceId: findId(model, "CheckStock"),
        targetId: findId(model, "Pack"),
      }),
    );

    const diagnostics = validate("activity", model);
    expect(
      diagnostics.some((item) => item.ruleId === "act.decision-has-guards-on-outgoing"),
    ).toBe(true);
  });

  it("does not warn when decision outgoing flows have guards", () => {
    let model = emptyModel("activity");
    model = mustAdd(addElement(model, { elementType: "decisionNode", name: "CheckStock" }));
    model = mustAdd(addElement(model, { elementType: "action", name: "Pack" }));
    model = mustAdd(
      addRelationship(model, {
        relationshipType: "controlFlow",
        sourceId: findId(model, "CheckStock"),
        targetId: findId(model, "Pack"),
        guard: "inStock",
      }),
    );

    const diagnostics = validate("activity", model);
    expect(
      diagnostics.some((item) => item.ruleId === "act.decision-has-guards-on-outgoing"),
    ).toBe(false);
  });

  it("warns act.fork-join-balance when a fork has no matching join", () => {
    let model = emptyModel("activity");
    model = mustAdd(addElement(model, { elementType: "forkNode", name: "Split" }));
    model = mustAdd(addElement(model, { elementType: "action", name: "A" }));
    model = mustAdd(addElement(model, { elementType: "action", name: "B" }));
    model = mustAdd(
      addRelationship(model, {
        relationshipType: "controlFlow",
        sourceId: findId(model, "Split"),
        targetId: findId(model, "A"),
      }),
    );
    model = mustAdd(
      addRelationship(model, {
        relationshipType: "controlFlow",
        sourceId: findId(model, "Split"),
        targetId: findId(model, "B"),
      }),
    );

    const diagnostics = validate("activity", model);
    expect(diagnostics.some((item) => item.ruleId === "act.fork-join-balance")).toBe(true);
  });

  it("does not warn act.fork-join-balance when a reachable join matches outgoing count", () => {
    let model = emptyModel("activity");
    model = mustAdd(addElement(model, { elementType: "forkNode", name: "Split" }));
    model = mustAdd(addElement(model, { elementType: "action", name: "A" }));
    model = mustAdd(addElement(model, { elementType: "action", name: "B" }));
    model = mustAdd(addElement(model, { elementType: "joinNode", name: "Together" }));
    model = mustAdd(
      addRelationship(model, {
        relationshipType: "controlFlow",
        sourceId: findId(model, "Split"),
        targetId: findId(model, "A"),
      }),
    );
    model = mustAdd(
      addRelationship(model, {
        relationshipType: "controlFlow",
        sourceId: findId(model, "Split"),
        targetId: findId(model, "B"),
      }),
    );
    model = mustAdd(
      addRelationship(model, {
        relationshipType: "controlFlow",
        sourceId: findId(model, "A"),
        targetId: findId(model, "Together"),
      }),
    );
    model = mustAdd(
      addRelationship(model, {
        relationshipType: "controlFlow",
        sourceId: findId(model, "B"),
        targetId: findId(model, "Together"),
      }),
    );

    const diagnostics = validate("activity", model);
    expect(diagnostics.some((item) => item.ruleId === "act.fork-join-balance")).toBe(false);
  });

  it("emits act.no-classes-as-actions for a forged class on an activity model", () => {
    const model: UmlModel = {
      ...emptyModel("activity"),
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

    const diagnostics = validate("activity", model);
    expect(diagnostics.some((item) => item.ruleId === "act.no-classes-as-actions")).toBe(true);
    expect(diagnostics.some((item) => item.ruleId === "rules.illegal-element-on-diagram")).toBe(
      true,
    );
  });
});
