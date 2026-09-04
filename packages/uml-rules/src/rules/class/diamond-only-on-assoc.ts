import { createId } from "@graphiq/uml-core";
import type { Diagnostic } from "@graphiq/uml-core";
import type { ElementType, UmlElement, UmlModel } from "@graphiq/uml-model";
import type { UmlRule } from "../../types.js";

const RULE_ID = "class.diamond-only-on-assoc";

const DIAMOND_RELATIONSHIPS = new Set(["aggregation", "composition"]);

const DIAMOND_END_TYPES = new Set<ElementType>(["class", "associationClass"]);

function isDiamondEnd(element: UmlElement): boolean {
  return DIAMOND_END_TYPES.has(element.elementType);
}

export const classDiamondOnlyOnAssocRule: UmlRule = {
  id: RULE_ID,
  diagramKinds: ["class"],
  severity: "error",
  check(model: UmlModel): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    for (const relationship of model.relationships) {
      if (!DIAMOND_RELATIONSHIPS.has(relationship.relationshipType)) {
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

      if (!isDiamondEnd(source) || !isDiamondEnd(target)) {
        diagnostics.push({
          id: createId(),
          ruleId: RULE_ID,
          severity: "error",
          message:
            "Filled and hollow diamonds are only for aggregation and composition, never for generalization or realization",
          elementIds: [relationship.id, source.id, target.id],
        });
      }
    }

    return diagnostics;
  },
};
