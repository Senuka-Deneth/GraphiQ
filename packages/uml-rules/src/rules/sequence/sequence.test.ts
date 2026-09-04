import { describe, expect, it } from "vitest";
import { createId } from "@graphiq/uml-core";
import {
  addElement,
  addRelationship,
  emptyModel,
  type CombinedFragmentElement,
  type UmlModel,
} from "@graphiq/uml-model";
import { SEQUENCE_CONNECTORS } from "../../matrices/sequence.js";
import { validate } from "../../validate.js";

function addLifeline(model: UmlModel, name: string): UmlModel {
  const result = addElement(model, { elementType: "lifeline", name });
  if (!result.ok) {
    throw new Error(result.error.message);
  }
  return result.value;
}

function addMessage(
  model: UmlModel,
  sourceName: string,
  targetName: string,
  messageSort: "synchCall" | "asynchCall" | "reply" | "createMessage",
): UmlModel {
  const sourceId = model.elements.find((element) => element.name === sourceName)?.id;
  const targetId = model.elements.find((element) => element.name === targetName)?.id;
  if (sourceId === undefined || targetId === undefined) {
    throw new Error("Missing lifeline endpoints");
  }

  const result = addRelationship(model, {
    relationshipType: "message",
    sourceId,
    targetId,
    messageSort,
  });
  if (!result.ok) {
    throw new Error(result.error.message);
  }
  return result.value;
}

describe("sequence connector matrix", () => {
  it("allows lifeline to lifeline messages", () => {
    expect(SEQUENCE_CONNECTORS).toHaveLength(5);
    let model = emptyModel("sequence");
    model = addLifeline(model, "customer");
    model = addLifeline(model, "shop");
    model = addMessage(model, "customer", "shop", "synchCall");
    expect(validate("sequence", model)).toEqual([]);
  });
});

describe("sequence rules", () => {
  it("fires sd.reply-matches-synch-call for an unmatched reply", () => {
    let model = emptyModel("sequence");
    model = addLifeline(model, "a");
    model = addLifeline(model, "b");
    model = addMessage(model, "a", "b", "reply");

    const diagnostics = validate("sequence", model);
    expect(diagnostics.some((item) => item.ruleId === "sd.reply-matches-synch-call")).toBe(true);
  });

  it("passes sd.reply-matches-synch-call when reply matches an earlier synch call", () => {
    let model = emptyModel("sequence");
    model = addLifeline(model, "shop");
    model = addLifeline(model, "pay");
    model = addMessage(model, "shop", "pay", "synchCall");
    model = addMessage(model, "pay", "shop", "reply");

    const diagnostics = validate("sequence", model).filter(
      (item) => item.ruleId === "sd.reply-matches-synch-call",
    );
    expect(diagnostics).toEqual([]);
  });

  it("fires sd.combined-fragment-operands-nonempty for empty operands", () => {
    let model = emptyModel("sequence");
    const fragment: CombinedFragmentElement = {
      id: createId(),
      elementType: "combinedFragment",
      name: "alt1",
      operator: "alt",
      operands: [],
    };
    model = {
      ...model,
      elements: [...model.elements, fragment],
    };

    const diagnostics = validate("sequence", model);
    expect(
      diagnostics.some((item) => item.ruleId === "sd.combined-fragment-operands-nonempty"),
    ).toBe(true);
  });

  it("rejects a class element on a sequence model via uml-model", () => {
    let model = emptyModel("sequence");
    const result = addElement(model, {
      elementType: "class",
      name: "Order",
    });
    expect(result.ok).toBe(false);
  });
});
