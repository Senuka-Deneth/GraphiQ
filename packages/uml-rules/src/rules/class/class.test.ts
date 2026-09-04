import { describe, expect, it } from "vitest";
import { createId } from "@graphiq/uml-core";
import {
  addElement,
  addRelationship,
  emptyModel,
  type UmlModel,
} from "@graphiq/uml-model";
import { validate } from "../../validate.js";

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

function expectRuleId(
  diagnostics: ReturnType<typeof validate>,
  ruleId: string,
): void {
  expect(
    diagnostics.some((diagnostic) => diagnostic.ruleId === ruleId),
  ).toBe(true);
}

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

    const diagnostics = validate("class", model);
    expect(diagnostics).toEqual([]);
    expect(
      diagnostics.some(
        (diagnostic) => diagnostic.ruleId === "class.diamond-only-on-assoc",
      ),
    ).toBe(false);
  });

  it("allows abstract class generalization", () => {
    let model = emptyModel("class");
    const abstractClass = addElement(model, {
      elementType: "class",
      name: "Document",
      isAbstract: true,
    });
    const concreteClass = addElement(
      abstractClass.ok ? abstractClass.value : model,
      { elementType: "class", name: "Order" },
    );
    if (!abstractClass.ok || !concreteClass.ok) {
      throw new Error("expected classes to be added");
    }
    model = concreteClass.value;

    const sourceId = model.elements.find(
      (element) => element.name === "Order",
    )?.id;
    const targetId = model.elements.find(
      (element) => element.name === "Document",
    )?.id;
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

    expect(validate("class", withRelationship.value)).toEqual([]);
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

    const sourceId = model.elements.find(
      (element) => element.elementType === "class",
    )?.id;
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
    expectRuleId(diagnostics, "rules.illegal-connector");
    expectRuleId(diagnostics, "class.gen.same-metaclass");
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

    const sourceId = model.elements.find(
      (element) => element.elementType === "class",
    )?.id;
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

  it("rejects interface to class realization with class.realize.classifier-to-interface", () => {
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

    const sourceId = model.elements.find(
      (element) => element.elementType === "interface",
    )?.id;
    const targetId = model.elements.find(
      (element) => element.elementType === "class",
    )?.id;
    if (!sourceId || !targetId) {
      throw new Error("expected ids");
    }

    model = {
      ...model,
      relationships: [
        {
          id: createId(),
          relationshipType: "realization",
          sourceId,
          targetId,
        },
      ],
    };

    const diagnostics = validate("class", model);
    expectRuleId(diagnostics, "rules.illegal-connector");
    expectRuleId(diagnostics, "class.realize.classifier-to-interface");
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
    expectRuleId(diagnostics, "class.assoc.multiplicity-syntax");
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

  it("allows recursive class composition Node *-- Node", () => {
    let model = emptyModel("class");
    const first = addElement(model, { elementType: "class", name: "Node" });
    const second = addElement(first.ok ? first.value : model, {
      elementType: "class",
      name: "NodeChild",
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
      relationshipType: "composition",
      sourceId,
      targetId,
    });
    if (!withRelationship.ok) {
      throw new Error("expected composition to be added");
    }

    expect(validate("class", withRelationship.value)).toEqual([]);
  });

  it("rejects class composition to interface with class.compose.two-classifiers", () => {
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

    const sourceId = model.elements.find(
      (element) => element.elementType === "class",
    )?.id;
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
          relationshipType: "composition",
          sourceId,
          targetId,
          sourceMultiplicity: "1",
          targetMultiplicity: "1",
        },
      ],
    };

    const diagnostics = validate("class", model);
    expectRuleId(diagnostics, "rules.illegal-connector");
    expectRuleId(diagnostics, "class.compose.two-classifiers");
    expectRuleId(diagnostics, "class.diamond-only-on-assoc");
  });

  it("rejects composition to note with class.diamond-only-on-assoc", () => {
    let model = emptyModel("class");
    const classResult = addElement(model, { elementType: "class", name: "Order" });
    const noteResult = addElement(classResult.ok ? classResult.value : model, {
      elementType: "note",
      name: "sticky",
    });
    if (!classResult.ok || !noteResult.ok) {
      throw new Error("expected class and note");
    }
    model = noteResult.value;

    const sourceId = model.elements.find(
      (element) => element.elementType === "class",
    )?.id;
    const targetId = model.elements.find(
      (element) => element.elementType === "note",
    )?.id;
    if (!sourceId || !targetId) {
      throw new Error("expected ids");
    }

    model = {
      ...model,
      relationships: [
        {
          id: createId(),
          relationshipType: "composition",
          sourceId,
          targetId,
          sourceMultiplicity: "1",
          targetMultiplicity: "1",
        },
      ],
    };

    const diagnostics = validate("class", model);
    expectRuleId(diagnostics, "rules.illegal-connector");
    expectRuleId(diagnostics, "class.compose.two-classifiers");
    expectRuleId(diagnostics, "class.diamond-only-on-assoc");
  });

  it("rejects forged actors with class.actor-forbidden", () => {
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
    expectRuleId(diagnostics, "class.actor-forbidden");
    expectRuleId(diagnostics, "rules.illegal-element-on-diagram");
  });

  it("rejects actor at the model command layer", () => {
    const result = addElement(emptyModel("class"), {
      elementType: "actor",
      name: "Customer",
    });
    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected addElement to fail");
    }
    expect(result.error.code).toBe("illegal-element-on-diagram");
  });
});
