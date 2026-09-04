import { createId } from "@graphiq/uml-core";
import type { Diagnostic } from "@graphiq/uml-core";
import type { UmlElement, UmlModel } from "@graphiq/uml-model";
import type { UmlRule } from "../../types.js";

const RULE_ID = "cmp.delegation-outer-to-inner-same-component";

function owningComponentId(model: UmlModel, element: UmlElement): string | undefined {
  if (element.elementType === "component") {
    return element.id;
  }

  if (element.parentId !== undefined) {
    const parent = model.elements.find((item) => item.id === element.parentId);
    if (parent?.elementType === "component") {
      return parent.id;
    }
  }

  const owner = model.relationships.find(
    (relationship) =>
      (relationship.relationshipType === "interfaceRealization" ||
        relationship.relationshipType === "usage") &&
      relationship.targetId === element.id,
  );
  return owner?.sourceId;
}

export const componentDelegationSameComponentRule: UmlRule = {
  id: RULE_ID,
  diagramKinds: ["component"],
  severity: "error",
  check(model: UmlModel): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    for (const relationship of model.relationships) {
      if (relationship.relationshipType !== "delegationConnector") {
        continue;
      }

      const source = model.elements.find((element) => element.id === relationship.sourceId);
      const target = model.elements.find((element) => element.id === relationship.targetId);
      if (source === undefined || target === undefined) {
        continue;
      }

      const sourceOwner = owningComponentId(model, source);
      const targetOwner = owningComponentId(model, target);
      if (sourceOwner !== undefined && sourceOwner === targetOwner) {
        continue;
      }

      diagnostics.push({
        id: createId(),
        ruleId: RULE_ID,
        severity: "error",
        message: "Delegation must connect an outer port to an inner port or interface of the same component",
        elementIds: [relationship.id, relationship.sourceId, relationship.targetId],
      });
    }

    return diagnostics;
  },
};
