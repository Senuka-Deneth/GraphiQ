import { describe, expect, it } from "vitest";
import { createId } from "@graphiq/uml-core";
import { addElement, addRelationship, emptyModel, type UmlModel } from "@graphiq/uml-model";
import { isConnectorAllowed } from "../../connectors.js";
import { INTERACTION_OVERVIEW_CONNECTORS } from "../../matrices/interactionOverview.js";
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

describe("interaction overview diagram rules", () => {
  it("allows control flow between interaction-use nodes in the matrix", () => {
    expect(
      isConnectorAllowed({
        kind: "interactionOverview",
        relationship: "controlFlow",
        source: "interactionUse",
        target: "interactionUse",
      }),
    ).toBe(true);
    expect(INTERACTION_OVERVIEW_CONNECTORS).toHaveLength(49);
  });

  it("rejects control flow from a note to an interaction use", () => {
    expect(
      isConnectorAllowed({
        kind: "interactionOverview",
        relationship: "controlFlow",
        source: "note",
        target: "interactionUse",
      }),
    ).toBe(false);
  });

  it("warns io.ref-names-an-interaction when the referenced interaction is not in the model", () => {
    let model = emptyModel("interactionOverview");
    model = mustAdd(addElement(model, { elementType: "interactionUse", name: "Checkout" }));

    const diagnostics = validate("interactionOverview", model);
    expect(diagnostics.some((item) => item.ruleId === "io.ref-names-an-interaction")).toBe(true);
  });

  it("does not warn io.ref-names-an-interaction when an interaction of that name exists", () => {
    const checkoutId = createId();
    const interactionId = createId();
    const model: UmlModel = {
      ...emptyModel("interactionOverview"),
      elements: [
        {
          id: checkoutId,
          elementType: "interactionUse",
          name: "Checkout",
        },
        {
          id: interactionId,
          elementType: "interaction",
          name: "Checkout",
        },
      ],
    };

    const diagnostics = validate("interactionOverview", model);
    expect(diagnostics.some((item) => item.ruleId === "io.ref-names-an-interaction")).toBe(false);
    expect(diagnostics.some((item) => item.ruleId === "rules.illegal-element-on-diagram")).toBe(
      true,
    );
  });

  it("emits io.flow-activity-like for control flow from a note", () => {
    const noteId = createId();
    const refId = createId();
    const flowId = createId();
    const model: UmlModel = {
      ...emptyModel("interactionOverview"),
      elements: [
        { id: noteId, elementType: "note", name: "Hint" },
        { id: refId, elementType: "interactionUse", name: "Checkout" },
      ],
      relationships: [
        {
          id: flowId,
          relationshipType: "controlFlow",
          sourceId: noteId,
          targetId: refId,
        },
      ],
    };

    const diagnostics = validate("interactionOverview", model);
    expect(diagnostics.some((item) => item.ruleId === "rules.illegal-connector")).toBe(true);
    expect(diagnostics.some((item) => item.ruleId === "io.flow-activity-like")).toBe(true);
  });

  it("emits io.flow-activity-like when an initial node has an incoming flow", () => {
    let model = emptyModel("interactionOverview");
    model = mustAdd(addElement(model, { elementType: "interactionUse", name: "Checkout" }));
    model = mustAdd(addElement(model, { elementType: "initialNode", name: "initial" }));
    model = mustAdd(
      addRelationship(model, {
        relationshipType: "controlFlow",
        sourceId: findId(model, "Checkout"),
        targetId: findId(model, "initial"),
      }),
    );

    const diagnostics = validate("interactionOverview", model);
    expect(diagnostics.some((item) => item.ruleId === "io.flow-activity-like")).toBe(true);
  });

  it("emits io.flow-activity-like when a final node has an outgoing flow", () => {
    let model = emptyModel("interactionOverview");
    model = mustAdd(addElement(model, { elementType: "interactionUse", name: "Fulfill" }));
    model = mustAdd(addElement(model, { elementType: "activityFinalNode", name: "final" }));
    model = mustAdd(
      addRelationship(model, {
        relationshipType: "controlFlow",
        sourceId: findId(model, "final"),
        targetId: findId(model, "Fulfill"),
      }),
    );

    const diagnostics = validate("interactionOverview", model);
    expect(diagnostics.some((item) => item.ruleId === "io.flow-activity-like")).toBe(true);
  });

  it("emits io.no-raw-messages-outside-ref for a forged message", () => {
    const sourceId = createId();
    const targetId = createId();
    const messageId = createId();
    const model: UmlModel = {
      ...emptyModel("interactionOverview"),
      elements: [
        { id: sourceId, elementType: "interactionUse", name: "Checkout" },
        { id: targetId, elementType: "interactionUse", name: "Fulfill" },
      ],
      relationships: [
        {
          id: messageId,
          relationshipType: "message",
          sourceId,
          targetId,
          messageSort: "synchCall",
        },
      ],
    };

    const diagnostics = validate("interactionOverview", model);
    expect(diagnostics.some((item) => item.ruleId === "io.no-raw-messages-outside-ref")).toBe(
      true,
    );
    expect(diagnostics.some((item) => item.ruleId === "rules.illegal-connector")).toBe(true);
  });

  it("accepts a legal interaction-use control flow with only unresolved-ref warnings", () => {
    let model = emptyModel("interactionOverview");
    model = mustAdd(addElement(model, { elementType: "interactionUse", name: "Checkout" }));
    model = mustAdd(addElement(model, { elementType: "interactionUse", name: "Fulfill" }));
    model = mustAdd(
      addRelationship(model, {
        relationshipType: "controlFlow",
        sourceId: findId(model, "Checkout"),
        targetId: findId(model, "Fulfill"),
      }),
    );

    const diagnostics = validate("interactionOverview", model);
    expect(diagnostics.every((item) => item.severity === "warning")).toBe(true);
    expect(
      diagnostics.filter((item) => item.ruleId === "io.ref-names-an-interaction"),
    ).toHaveLength(2);
  });
});
