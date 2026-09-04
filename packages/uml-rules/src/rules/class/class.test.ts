import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createId } from "@graphiq/uml-core";
import {
  addElement,
  addRelationship,
  emptyModel,
  type UmlModel,
} from "@graphiq/uml-model";
import {
  clearRegisteredRules,
  registerClassRules,
  validate,
} from "../../index.js";

function buildTwoClassModel(): UmlModel {
  const first = addElement(emptyModel("class"), {
    elementType: "class",
    name: "A",
  });
  const second = addElement(first.ok ? first.value : emptyModel("class"), {
    elementType: "class",
    name: "B",
  });
  if (!first.ok || !second.ok) {
    throw new Error("expected classes to be added");
  }
  return second.value;
}

beforeEach(() => {
  clearRegisteredRules();
  registerClassRules();
});

afterEach(() => {
  clearRegisteredRules();
  registerClassRules();
});

describe("class diagram rules", () => {
  it("allows legal class generalization", () => {
    let model = buildTwoClassModel();
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

    expect(validate("class", model)).toEqual([]);
  });

  it("rejects class generalization to interface with class.gen.same-metaclass", () => {
    let model = emptyModel("class");
    const classResult = addElement(model, { elementType: "class", name: "A" });
    const interfaceResult = addElement(
      classResult.ok ? classResult.value : model,
      { elementType: "interface", name: "Payable" },
    );
    if (!classResult.ok || !interfaceResult.ok) {
      throw new Error("expected class and interface");
    }
    model = interfaceResult.value;

    const sourceId = model.elements.find((element) => element.elementType === "class")?.id;
    const targetId = model.elements.find(
      (element) => element.elementType === "interface",
    )?.id;
    if (!sourceId || !targetId) {
      throw new Error("expected ids");
    }

    model = {
      ...model,
      relationships: [
        {
          id: createId(),
          relationshipType: "generalization",
          sourceId,
          targetId,
        },
      ],
    };

    const diagnostics = validate("class", model);
    expect(
      diagnostics.some(
        (diagnostic) => diagnostic.ruleId === "rules.illegal-connector",
      ),
    ).toBe(true);
  });

  it("allows class realization to interface", () => {
    let model = emptyModel("class");
    const classResult = addElement(model, { elementType: "class", name: "Order" });
    const interfaceResult = addElement(
      classResult.ok ? classResult.value : model,
      { elementType: "interface", name: "Payable" },
    );
    if (!classResult.ok || !interfaceResult.ok) {
      throw new Error("expected class and interface");
    }
    model = interfaceResult.value;

    const sourceId = model.elements.find((element) => element.elementType === "class")?.id;
    const targetId = model.elements.find(
      (element) => element.elementType === "interface",
    )?.id;
    if (!sourceId || !targetId) {
      throw new Error("expected ids");
    }

    const withRelationship = addRelationship(model, {
      relationshipType: "realization",
      sourceId,
      targetId,
    });
    if (!withRelationship.ok) {
      throw new Error("expected realization to be added");
    }

    expect(validate("class", withRelationship.value)).toEqual([]);
  });

  it("rejects invalid multiplicity 1..0 with class.assoc.multiplicity-syntax", () => {
    let model = buildTwoClassModel();
    const sourceId = model.elements[0]?.id;
    const targetId = model.elements[1]?.id;
    if (!sourceId || !targetId) {
      throw new Error("expected class ids");
    }

    model = {
      ...model,
      relationships: [
        {
          id: createId(),
          relationshipType: "association",
          sourceId,
          targetId,
          sourceMultiplicity: "1..0",
          targetMultiplicity: "1",
        },
      ],
    };

    const diagnostics = validate("class", model);
    expect(
      diagnostics.some(
        (diagnostic) => diagnostic.ruleId === "class.assoc.multiplicity-syntax",
      ),
    ).toBe(true);
  });

  it("accepts legal multiplicity 0..*", () => {
    let model = buildTwoClassModel();
    const sourceId = model.elements[0]?.id;
    const targetId = model.elements[1]?.id;
    if (!sourceId || !targetId) {
      throw new Error("expected class ids");
    }

    const withRelationship = addRelationship(model, {
      relationshipType: "association",
      sourceId,
      targetId,
      sourceMultiplicity: "0..*",
      targetMultiplicity: "1",
    });
    if (!withRelationship.ok) {
      throw new Error("expected association to be added");
    }

    expect(validate("class", withRelationship.value)).toEqual([]);
  });

  it("reports class.actor-forbidden for forged actors", () => {
    const model: UmlModel = {
      ...emptyModel("class"),
      elements: [
        {
          id: createId(),
          elementType: "actor",
          name: "Customer",
        },
      ],
    };

    const diagnostics = validate("class", model);
    expect(diagnostics).toContainEqual(
      expect.objectContaining({
        ruleId: "rules.illegal-element-on-diagram",
        severity: "error",
      }),
    );
  });
});
