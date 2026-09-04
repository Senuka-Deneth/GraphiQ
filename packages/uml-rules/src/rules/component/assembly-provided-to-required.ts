import { createId } from "@graphiq/uml-core";
import type { Diagnostic } from "@graphiq/uml-core";
import type { UmlModel } from "@graphiq/uml-model";
import type { UmlRule } from "../../types.js";

const RULE_ID = "cmp.assembly-provided-to-required";

function isRequiredInterface(model: UmlModel, elementId: string): boolean {
  return model.relationships.some(
    (relationship) =>
      relationship.relationshipType === "usage" && relationship.targetId === elementId,
  );
}

function isProvidedInterface(model: UmlModel, elementId: string): boolean {
  return model.relationships.some(
    (relationship) =>
      relationship.relationshipType === "interfaceRealization" &&
      relationship.targetId === elementId,
  );
}

export const componentAssemblyProvidedToRequiredRule: UmlRule = {
  id: RULE_ID,
  diagramKinds: ["component"],
  severity: "error",
  check(model: UmlModel): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    for (const relationship of model.relationships) {
      if (relationship.relationshipType !== "assemblyConnector") {
        continue;
      }

      const source = model.elements.find((element) => element.id === relationship.sourceId);
      const target = model.elements.find((element) => element.id === relationship.targetId);
      if (source === undefined || target === undefined) {
        continue;
      }

      const sourceOk =
        source.elementType === "port" ||
        (source.elementType === "interface" && isRequiredInterface(model, source.id));
      const targetOk =
        target.elementType === "port" ||
        (target.elementType === "interface" && isProvidedInterface(model, target.id));

      if (sourceOk && targetOk) {
        continue;
      }

      diagnostics.push({
        id: createId(),
        ruleId: RULE_ID,
        severity: "error",
        message: "Assembly must connect a required interface or port to a provided interface or port",
        elementIds: [relationship.id, relationship.sourceId, relationship.targetId],
      });
    }

    return diagnostics;
  },
};
