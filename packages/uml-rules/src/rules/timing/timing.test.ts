import { createId } from "@graphiq/uml-core";
import { addElement, emptyModel } from "@graphiq/uml-model";
import { describe, expect, it } from "vitest";
import { TIMING_CONNECTORS } from "../../matrices/timing.js";
import { validate } from "../../validate.js";

describe("timing connector matrix", () => {
  it("allows message between lifelines", () => {
    expect(TIMING_CONNECTORS).toHaveLength(1);
    let model = emptyModel("timing");
    const lifelineA = addElement(model, {
      elementType: "lifeline",
      name: "a",
    });
    if (!lifelineA.ok) {
      throw new Error("expected addElement to succeed");
    }
    const lifelineB = addElement(lifelineA.value, {
      elementType: "lifeline",
      name: "b",
    });
    if (!lifelineB.ok) {
      throw new Error("expected addElement to succeed");
    }
    model = lifelineB.value;
    expect(validate("timing", model)).toEqual([]);
  });
});

describe("timing rules", () => {
  it("validates empty timing model", () => {
    expect(validate("timing", emptyModel("timing"))).toEqual([]);
  });

  it("rejects timing state without lifeline parent", () => {
    let model = emptyModel("timing");
    const result = addElement(model, {
      elementType: "timingState",
      name: "Off",
      at: 0,
    });
    if (!result.ok) {
      throw new Error("expected addElement to succeed");
    }
    model = result.value;

    const diagnostics = validate("timing", model);
    expect(diagnostics.some((diagnostic) => diagnostic.ruleId === "tm.state-belongs-to-lifeline")).toBe(
      true,
    );
  });

  it("rejects overlapping intervals on one lifeline", () => {
    let model = emptyModel("timing");
    const lifeline = addElement(model, {
      elementType: "lifeline",
      name: "lamp",
      classifierName: "Lamp",
    });
    if (!lifeline.ok) {
      throw new Error("expected lifeline");
    }
    model = lifeline.value;
    const lifelineId = model.elements[0]?.id;
    if (lifelineId === undefined) {
      throw new Error("expected lifeline id");
    }

    const off = addElement(model, {
      elementType: "timingState",
      name: "Off",
      parentId: lifelineId,
      at: 0,
      until: 20,
    });
    if (!off.ok) {
      throw new Error("expected off state");
    }
    const on = addElement(off.value, {
      elementType: "timingState",
      name: "On",
      parentId: lifelineId,
      at: 10,
      until: 30,
    });
    if (!on.ok) {
      throw new Error("expected states");
    }

    const diagnostics = validate("timing", on.value);
    expect(
      diagnostics.some(
        (diagnostic) => diagnostic.ruleId === "tm.intervals-non-overlapping-per-lifeline",
      ),
    ).toBe(true);
  });

  it("rejects message without shared interval coverage", () => {
    let model = emptyModel("timing");
    const a = addElement(model, { elementType: "lifeline", name: "a" });
    if (!a.ok) {
      throw new Error("expected lifeline a");
    }
    const b = addElement(a.value, { elementType: "lifeline", name: "b" });
    if (!b.ok) {
      throw new Error("expected lifelines");
    }
    model = b.value;
    const [source, target] = model.elements;
    if (source === undefined || target === undefined) {
      throw new Error("expected endpoints");
    }

    model = {
      ...model,
      relationships: [
        {
          id: createId(),
          relationshipType: "message",
          sourceId: source.id,
          targetId: target.id,
          messageSort: "synchCall",
          time: 5,
        },
      ],
    };

    const diagnostics = validate("timing", model);
    expect(
      diagnostics.some((diagnostic) => diagnostic.ruleId === "tm.message-at-shared-time"),
    ).toBe(true);
  });

  it("rejects a class element on a timing model via uml-model", () => {
    let model = emptyModel("timing");
    const result = addElement(model, {
      elementType: "class",
      name: "Bad",
    });
    expect(result.ok).toBe(false);
  });
});
