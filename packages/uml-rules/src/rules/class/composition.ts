import { createId } from "@graphiq/uml-core";
import type { Diagnostic } from "@graphiq/uml-core";
import { isClassifierElement, type UmlModel } from "@graphiq/uml-model";
import type { UmlRule } from "../../types.js";

const RULE_ID = "class.compose.two-classifiers";

const WHOLE_PART_RELATIONSHIPS = new Set([
  "aggregation",
  "composition",
]);

export const classCompositionRule: UmlRule = {
  id: RULE_ID,
  diagramKinds: ["class"],
  severity: "error",
  check(model: UmlModel): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    for (const relationship of model.relationships) {
      if (!WHOLE_PART_RELATIONSHIPS.has(relationship.relationshipType)) {
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

      if (
        !isClassifierElement(source) ||
        !isClassifierElement(target) ||
        source.elementType !== "class" ||
        target.elementType !== "class"
      ) {
        diagnostics.push({
          id: createId(),
          ruleId: RULE_ID,
          severity: "error",
          message: `Aggregation and composition require class classifiers at both ends; got ${source.elementType} to ${target.elementType}`,
          elementIds: [relationship.id, source.id, target.id],
        });
      }
    }

    return diagnostics;
  },
};
