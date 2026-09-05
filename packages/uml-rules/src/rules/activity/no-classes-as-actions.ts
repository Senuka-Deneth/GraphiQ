import { createId } from "@graphiq/uml-core";
import type { Diagnostic } from "@graphiq/uml-core";
import type { ElementType, UmlModel } from "@graphiq/uml-model";
import type { UmlRule } from "../../types.js";

const RULE_ID = "act.no-classes-as-actions";

const FORBIDDEN_CLASSIFIER_TYPES: ReadonlySet<ElementType> = new Set([
  "class",
  "interface",
  "dataType",
  "enumeration",
  "primitiveType",
  "associationClass",
]);

export const activityNoClassesAsActionsRule: UmlRule = {
  id: RULE_ID,
  diagramKinds: ["activity"],
  severity: "error",
  check(model: UmlModel): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    for (const element of model.elements) {
      if (!FORBIDDEN_CLASSIFIER_TYPES.has(element.elementType)) {
        continue;
      }

      diagnostics.push({
        id: createId(),
        ruleId: RULE_ID,
        severity: "error",
        message: `Classifier type "${element.elementType}" cannot appear as an activity node`,
        elementIds: [element.id],
      });
    }

    return diagnostics;
  },
};
