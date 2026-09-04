import { createId } from "@graphiq/uml-core";
import { describe, expect, it } from "vitest";
import { addElement, addRelationship, emptyModel, type UmlModel } from "@graphiq/uml-model";
import { isConnectorAllowed } from "../../connectors.js";
import { validate } from "../../validate.js";

describe("deployment diagram rules", () => {
  it("allows a communication path between devices", () => {
    let model = emptyModel("deployment");
    const cluster = addElement(model, { elementType: "device", name: "AppCluster" });
    const db = addElement(cluster.ok ? cluster.value : model, {
      elementType: "device",
      name: "DB",
    });
    if (!cluster.ok || !db.ok) {
      throw new Error("expected devices");
    }
    model = db.value;
    const sourceId = model.elements.find((element) => element.name === "AppCluster")?.id;
    const targetId = model.elements.find((element) => element.name === "DB")?.id;
    if (sourceId === undefined || targetId === undefined) {
      throw new Error("expected ids");
    }

    const path = addRelationship(model, {
      relationshipType: "communicationPath",
      sourceId,
      targetId,
      name: "SQL",
    });
    if (!path.ok) {
      throw new Error("expected communication path");
    }

    expect(validate("deployment", path.value)).toEqual([]);
  });

  it("reports dep.no-usecase-elements for a forged actor", () => {
    const model: UmlModel = {
      ...emptyModel("deployment"),
      elements: [
        {
          id: createId(),
          elementType: "actor",
          name: "Customer",
        },
      ],
    };

    const diagnostics = validate("deployment", model);
    expect(diagnostics.some((diagnostic) => diagnostic.ruleId === "dep.no-usecase-elements")).toBe(
      true,
    );
  });

  it("allows communicationPath and deployment triples in the matrix", () => {
    expect(
      isConnectorAllowed({
        kind: "deployment",
        relationship: "communicationPath",
        source: "device",
        target: "device",
      }),
    ).toBe(true);
    expect(
      isConnectorAllowed({
        kind: "deployment",
        relationship: "deployment",
        source: "artifact",
        target: "device",
      }),
    ).toBe(true);
  });
});
