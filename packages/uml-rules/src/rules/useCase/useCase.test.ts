import { describe, expect, it } from "vitest";
import { addElement, addRelationship, emptyModel, type UmlModel } from "@graphiq/uml-model";
import { isConnectorAllowed } from "../../connectors.js";
import { USE_CASE_CONNECTORS } from "../../matrices/useCase.js";
import { validate } from "../../validate.js";

function addActor(model: ReturnType<typeof emptyModel>, name: string) {
  const result = addElement(model, { elementType: "actor", name });
  if (!result.ok) {
    throw new Error("expected actor");
  }
  return result.value;
}

function addUseCase(model: ReturnType<typeof emptyModel>, name: string) {
  const result = addElement(model, { elementType: "useCase", name });
  if (!result.ok) {
    throw new Error("expected use case");
  }
  return result.value;
}

describe("use case diagram rules", () => {
  it("allows actor-to-use case association in the matrix", () => {
    expect(
      isConnectorAllowed({
        kind: "useCase",
        relationship: "association",
        source: "actor",
        target: "useCase",
      }),
    ).toBe(true);
    expect(USE_CASE_CONNECTORS.length).toBeGreaterThan(0);
  });

  it("rejects actor-to-actor association with uc.assoc.actor-to-usecase", () => {
    let model = emptyModel("useCase");
    model = addActor(model, "Customer");
    model = addActor(model, "Clerk");

    const customer = model.elements.find((element) => element.name === "Customer");
    const clerk = model.elements.find((element) => element.name === "Clerk");
    if (!customer || !clerk) {
      throw new Error("expected actors");
    }

    const linked = addRelationship(model, {
      relationshipType: "association",
      sourceId: customer.id,
      targetId: clerk.id,
    });
    if (!linked.ok) {
      throw new Error("expected relationship");
    }

    const diagnostics = validate("useCase", linked.value);
    expect(diagnostics.some((item) => item.ruleId === "rules.illegal-connector")).toBe(true);
    expect(diagnostics.some((item) => item.ruleId === "uc.assoc.actor-to-usecase")).toBe(true);
  });

  it("allows include between use cases", () => {
    let model = emptyModel("useCase");
    model = addUseCase(model, "Checkout");
    model = addUseCase(model, "Pay");

    const checkout = model.elements.find((element) => element.name === "Checkout");
    const pay = model.elements.find((element) => element.name === "Pay");
    if (!checkout || !pay) {
      throw new Error("expected use cases");
    }

    const linked = addRelationship(model, {
      relationshipType: "include",
      sourceId: checkout.id,
      targetId: pay.id,
    });
    if (!linked.ok) {
      throw new Error("expected include");
    }

    expect(validate("useCase", linked.value)).toEqual([]);
  });

  it("forbids class elements with uc.no-class-attributes", () => {
    const model: UmlModel = {
      ...emptyModel("useCase"),
      elements: [
        {
          id: "class-1",
          elementType: "class",
          name: "Order",
          isAbstract: false,
          attributes: [],
          operations: [],
        },
      ],
    };

    const diagnostics = validate("useCase", model);
    expect(diagnostics.some((item) => item.ruleId === "uc.no-class-attributes")).toBe(true);
    expect(diagnostics.some((item) => item.ruleId === "rules.illegal-element-on-diagram")).toBe(
      true,
    );
  });
});
