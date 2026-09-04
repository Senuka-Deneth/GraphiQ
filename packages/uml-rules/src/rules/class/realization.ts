import { createId } from "@graphiq/uml-core";
import type { Diagnostic } from "@graphiq/uml-core";
import type { UmlModel } from "@graphiq/uml-model";
import type { UmlRule } from "../../types.js";

const RULE_ID = "class.realize.classifier-to-interface";

const REALIZATION_RELATIONSHIPS = new Set([
  "realization",
  "interfaceRealization",
]);

export const classRealizationRule: UmlRule = {
  id: RULE_ID,
  diagramKinds: ["class"],
  severity: "error",
  check(model: UmlModel): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    for (const relationship of model.relationships) {
      if (!REALIZATION_RELATIONSHIPS.has(relationship.relationshipType)) {
        continue;
      }

      const source = model.elements.find(
        (element) => element.id === relationship.sourceId,
      );
      const target = model.elements.find(
        (element) => element.id === relationship.targetId,
      );

      if (!source || !target) {
        continue;
      }

      const sourceIsClass = source.elementType === "class";
      const targetIsInterface = target.elementType === "interface";

      if (!sourceIsClass || !targetIsInterface) {
        diagnostics.push({
          id: createId(),
          ruleId: RULE_ID,
          severity: "error",
          message: `Realization requires a class source and an interface target; got ${source.elementType} to ${target.elementType}`,
          elementIds: [relationship.id, source.id, target.id],
        });
      }
    }

    return diagnostics;
  },
};
