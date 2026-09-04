import { createId } from "@graphiq/uml-core";
import { describe, expect, it } from "vitest";
import { addElement, addRelationship, emptyModel, type UmlModel } from "@graphiq/uml-model";
import { isConnectorAllowed } from "../../connectors.js";
import { validate } from "../../validate.js";

function twoComponentsWithInterfaces(): UmlModel {
  let model = emptyModel("component");
  const payments = addElement(model, { elementType: "component", name: "Payments" });
  if (!payments.ok) {
    throw new Error("expected Payments");
  }
  model = payments.value;
  const paymentsId = model.elements[0]?.id;
  if (paymentsId === undefined) {
    throw new Error("expected Payments id");
  }

  const accounting = addElement(model, { elementType: "component", name: "Accounting" });
  if (!accounting.ok) {
    throw new Error("expected Accounting");
  }
  model = accounting.value;
  const accountingId = model.elements.find((element) => element.name === "Accounting")?.id;
  if (accountingId === undefined) {
    throw new Error("expected Accounting id");
  }

  const requiredLedger = addElement(model, {
    elementType: "interface",
    name: "Ledger",
    parentId: paymentsId,
  });
  if (!requiredLedger.ok) {
    throw new Error("expected required Ledger");
  }
  model = requiredLedger.value;

  const providedLedger = addElement(model, {
    elementType: "interface",
    name: "Ledger",
    parentId: accountingId,
  });
  if (!providedLedger.ok) {
    throw new Error("expected provided Ledger");
  }
  model = providedLedger.value;

  const requiredId = model.elements.find(
    (element) => element.elementType === "interface" && element.parentId === paymentsId,
  )?.id;
  const providedId = model.elements.find(
    (element) => element.elementType === "interface" && element.parentId === accountingId,
  )?.id;
  if (requiredId === undefined || providedId === undefined) {
    throw new Error("expected interface ids");
  }

  const usage = addRelationship(model, {
    relationshipType: "usage",
    sourceId: paymentsId,
    targetId: requiredId,
  });
  if (!usage.ok) {
    throw new Error("expected usage");
  }
  model = usage.value;

  const provided = addRelationship(model, {
    relationshipType: "interfaceRealization",
    sourceId: accountingId,
    targetId: providedId,
  });
  if (!provided.ok) {
    throw new Error("expected interface realization");
  }
  return provided.value;
}

describe("component diagram rules", () => {
  it("allows assembly from a required interface to a provided interface", () => {
    let model = twoComponentsWithInterfaces();
    const requiredId = model.elements.find(
      (element) =>
        element.elementType === "interface" &&
        model.relationships.some(
          (relationship) =>
            relationship.relationshipType === "usage" && relationship.targetId === element.id,
        ),
    )?.id;
    const providedId = model.elements.find(
      (element) =>
        element.elementType === "interface" &&
        model.relationships.some(
          (relationship) =>
            relationship.relationshipType === "interfaceRealization" &&
            relationship.targetId === element.id,
        ),
    )?.id;
    if (requiredId === undefined || providedId === undefined) {
      throw new Error("expected assembly ends");
    }

    const assembled = addRelationship(model, {
      relationshipType: "assemblyConnector",
      sourceId: requiredId,
      targetId: providedId,
    });
    if (!assembled.ok) {
      throw new Error("expected assembly");
    }
    model = assembled.value;

    expect(validate("component", model)).toEqual([]);
  });

  it("rejects assembly between two provided interfaces", () => {
    let model = emptyModel("component");
    const first = addElement(model, { elementType: "component", name: "A" });
    const second = addElement(first.ok ? first.value : model, {
      elementType: "component",
      name: "B",
    });
    if (!first.ok || !second.ok) {
      throw new Error("expected components");
    }
    model = second.value;
    const aId = model.elements.find((element) => element.name === "A")?.id;
    const bId = model.elements.find((element) => element.name === "B")?.id;
    if (aId === undefined || bId === undefined) {
      throw new Error("expected ids");
    }

    const foo = addElement(model, { elementType: "interface", name: "Foo", parentId: aId });
    const bar = addElement(foo.ok ? foo.value : model, {
      elementType: "interface",
      name: "Bar",
      parentId: bId,
    });
    if (!foo.ok || !bar.ok) {
      throw new Error("expected interfaces");
    }
    model = bar.value;
    const fooId = model.elements.find((element) => element.name === "Foo")?.id;
    const barId = model.elements.find((element) => element.name === "Bar")?.id;
    if (fooId === undefined || barId === undefined) {
      throw new Error("expected interface ids");
    }

    const realizeA = addRelationship(model, {
      relationshipType: "interfaceRealization",
      sourceId: aId,
      targetId: fooId,
    });
    const realizeB = addRelationship(realizeA.ok ? realizeA.value : model, {
      relationshipType: "interfaceRealization",
      sourceId: bId,
      targetId: barId,
    });
    if (!realizeA.ok || !realizeB.ok) {
      throw new Error("expected realizations");
    }
    model = realizeB.value;

    const assembled = addRelationship(model, {
      relationshipType: "assemblyConnector",
      sourceId: fooId,
      targetId: barId,
    });
    if (!assembled.ok) {
      throw new Error("expected assembly command to succeed at model layer");
    }

    const diagnostics = validate("component", assembled.value);
    expect(
      diagnostics.some((diagnostic) => diagnostic.ruleId === "cmp.assembly-provided-to-required"),
    ).toBe(true);
  });

  it("reports cmp.no-actor for a forged actor", () => {
    const model: UmlModel = {
      ...emptyModel("component"),
      elements: [
        {
          id: createId(),
          elementType: "actor",
          name: "Customer",
        },
      ],
    };

    const diagnostics = validate("component", model);
    expect(diagnostics.some((diagnostic) => diagnostic.ruleId === "cmp.no-actor")).toBe(true);
    expect(
      diagnostics.some((diagnostic) => diagnostic.ruleId === "rules.illegal-element-on-diagram"),
    ).toBe(true);
  });

  it("rejects adding an actor through model commands", () => {
    const model = emptyModel("component");
    const result = addElement(model, { elementType: "actor", name: "Customer" });
    expect(result.ok).toBe(false);
  });

  it("allows component to interface usage and realization in the matrix", () => {
    expect(
      isConnectorAllowed({
        kind: "component",
        relationship: "usage",
        source: "component",
        target: "interface",
      }),
    ).toBe(true);
    expect(
      isConnectorAllowed({
        kind: "component",
        relationship: "interfaceRealization",
        source: "component",
        target: "interface",
      }),
    ).toBe(true);
    expect(
      isConnectorAllowed({
        kind: "component",
        relationship: "assemblyConnector",
        source: "interface",
        target: "interface",
      }),
    ).toBe(true);
  });
});
