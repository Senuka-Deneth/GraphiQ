import { afterEach, describe, expect, it } from "vitest";
import { createId, DIAGRAM_KINDS } from "@graphiq/uml-core";
import type { Diagnostic } from "@graphiq/uml-core";
import { addElement, addRelationship, emptyModel } from "@graphiq/uml-model";
import type { UmlModel } from "@graphiq/uml-model";
import { isConnectorAllowed } from "./connectors.js";
import {
  ACTIVITY_CONNECTORS,
  CLASS_CONNECTORS,
  COMMUNICATION_CONNECTORS,
  COMPONENT_CONNECTORS,
  COMPOSITE_STRUCTURE_CONNECTORS,
  DEPLOYMENT_CONNECTORS,
  getConnectorMatrix,
  INTERACTION_OVERVIEW_CONNECTORS,
  OBJECT_CONNECTORS,
  PACKAGE_CONNECTORS,
  PROFILE_CONNECTORS,
  SEQUENCE_CONNECTORS,
  STATE_MACHINE_CONNECTORS,
  TIMING_CONNECTORS,
  USE_CASE_CONNECTORS,
} from "./matrices/index.js";
import { clearRegisteredRules, registerRule } from "./registry.js";
import { validate } from "./validate.js";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

afterEach(() => {
  clearRegisteredRules();
});

describe("validate", () => {
  it("returns no diagnostics for an empty model on every diagram kind", () => {
    for (const kind of DIAGRAM_KINDS) {
      const model = emptyModel(kind);
      expect(validate(kind, model)).toEqual([]);
    }
  });

  it("allows class generalization when the matrix is filled", () => {
    let model = emptyModel("class");

    const first = addElement(model, { elementType: "class", name: "A" });
    const second = addElement(first.ok ? first.value : model, {
      elementType: "class",
      name: "B",
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
      relationshipType: "generalization",
      sourceId,
      targetId,
    });
    if (!withRelationship.ok) {
      throw new Error("expected generalization to be added by uml-model");
    }
    model = withRelationship.value;

    expect(validate("class", model)).toEqual([]);
  });

  it("reports illegal-element-on-diagram for a forged activity element on a class model", () => {
    const model: UmlModel = {
      ...emptyModel("class"),
      elements: [
        {
          id: createId(),
          elementType: "action",
          name: "ReceiveOrder",
        },
      ],
    };

    const diagnostics = validate("class", model);
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]).toMatchObject({
      ruleId: "rules.illegal-element-on-diagram",
      severity: "error",
      elementIds: [model.elements[0]?.id],
      message: 'Element type "action" is not allowed on a class diagram',
    });
    expect(diagnostics[0]?.id).toMatch(UUID_PATTERN);
  });

  it("reports illegal-connector when relationship endpoints are missing", () => {
    const relationshipId = createId();
    const model: UmlModel = {
      ...emptyModel("class"),
      relationships: [
        {
          id: relationshipId,
          relationshipType: "association",
          sourceId: createId(),
          targetId: createId(),
          sourceMultiplicity: "1",
          targetMultiplicity: "1",
        },
      ],
    };

    const diagnostics = validate("class", model);
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]).toMatchObject({
      ruleId: "rules.illegal-connector",
      severity: "error",
      message:
        "Relationship endpoints must reference existing elements on the diagram",
    });
  });
});

describe("connector matrices", () => {
  it("exports empty matrices for unimplemented kinds and filled implemented-kind matrices", () => {
    expect(CLASS_CONNECTORS).toHaveLength(164);
    expect(OBJECT_CONNECTORS).toHaveLength(2);
    expect(PACKAGE_CONNECTORS).toHaveLength(9);
    expect(COMPOSITE_STRUCTURE_CONNECTORS).toHaveLength(33);
    expect(COMPONENT_CONNECTORS).toHaveLength(19);
    expect(DEPLOYMENT_CONNECTORS).toHaveLength(21);
    expect(PROFILE_CONNECTORS).toHaveLength(2);
    expect(USE_CASE_CONNECTORS).toHaveLength(6);
    expect(ACTIVITY_CONNECTORS).toHaveLength(67);
    expect(STATE_MACHINE_CONNECTORS).toHaveLength(9);
    expect(SEQUENCE_CONNECTORS).toHaveLength(0);
    expect(COMMUNICATION_CONNECTORS).toHaveLength(8);
    expect(TIMING_CONNECTORS).toHaveLength(0);
    expect(INTERACTION_OVERVIEW_CONNECTORS).toHaveLength(0);

    for (const kind of DIAGRAM_KINDS) {
      if (kind === "class") {
        expect(getConnectorMatrix(kind)).toHaveLength(164);
      } else if (kind === "object") {
        expect(getConnectorMatrix(kind)).toHaveLength(2);
      } else if (kind === "package") {
        expect(getConnectorMatrix(kind)).toHaveLength(9);
      } else if (kind === "component") {
        expect(getConnectorMatrix(kind)).toHaveLength(19);
      } else if (kind === "deployment") {
        expect(getConnectorMatrix(kind)).toHaveLength(21);
      } else if (kind === "profile") {
        expect(getConnectorMatrix(kind)).toHaveLength(2);
      } else if (kind === "useCase") {
        expect(getConnectorMatrix(kind)).toHaveLength(6);
      } else if (kind === "compositeStructure") {
        expect(getConnectorMatrix(kind)).toHaveLength(33);
      } else if (kind === "communication") {
        expect(getConnectorMatrix(kind)).toHaveLength(8);
      } else if (kind === "activity") {
        expect(getConnectorMatrix(kind)).toHaveLength(67);
      } else if (kind === "stateMachine") {
        expect(getConnectorMatrix(kind)).toHaveLength(9);
      } else {
        expect(getConnectorMatrix(kind)).toHaveLength(0);
      }
    }
  });

  it("allows class generalization triples in the class matrix", () => {
    expect(
      isConnectorAllowed({
        kind: "class",
        relationship: "generalization",
        source: "class",
        target: "class",
      }),
    ).toBe(true);
  });

  it("rejects class generalization to interface in the class matrix", () => {
    expect(
      isConnectorAllowed({
        kind: "class",
        relationship: "generalization",
        source: "class",
        target: "interface",
      }),
    ).toBe(false);
  });
});

describe("rule registry", () => {
  it("runs registered rules alongside built-in class rules", () => {
    const classDiagnostic: Diagnostic = {
      id: "diag-class",
      ruleId: "class.test-rule",
      severity: "warning",
      message: "class rule fired",
      elementIds: [],
    };

    registerRule({
      id: "class.test-rule",
      diagramKinds: ["class"],
      severity: "warning",
      check: () => [classDiagnostic],
    });

    const classResult = validate("class", emptyModel("class"));
    expect(classResult).toEqual([classDiagnostic]);

    const sequenceResult = validate("sequence", emptyModel("sequence"));
    expect(sequenceResult).toEqual([]);
  });

  it("keeps built-in class rules when the registry is cleared", () => {
    registerRule({
      id: "class.persistent",
      diagramKinds: ["class"],
      severity: "error",
      check: () => [
        {
          id: "diag-persistent",
          ruleId: "class.persistent",
          severity: "error",
          message: "should not leak",
          elementIds: [],
        },
      ],
    });

    clearRegisteredRules();
    expect(validate("class", emptyModel("class"))).toEqual([]);
  });
});
