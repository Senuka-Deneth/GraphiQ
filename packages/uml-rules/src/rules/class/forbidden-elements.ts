import { createId } from "@graphiq/uml-core";
import type { Diagnostic } from "@graphiq/uml-core";
import type { ElementType, UmlModel } from "@graphiq/uml-model";
import type { UmlRule } from "../../types.js";

const RULE_ID = "class.actor-forbidden";

const FORBIDDEN_ELEMENT_TYPES = new Set<ElementType>([
  "actor",
  "useCase",
  "node",
  "lifeline",
]);

export const classForbiddenElementsRule: UmlRule = {
  id: RULE_ID,
  diagramKinds: ["class"],
  severity: "error",
  check(model: UmlModel): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    for (const element of model.elements) {
      if (!FORBIDDEN_ELEMENT_TYPES.has(element.elementType)) {
        continue;
      }

      diagnostics.push({
        id: createId(),
        ruleId: RULE_ID,
        severity: "error",
        message: `Element type "${element.elementType}" cannot appear on a class diagram`,
        elementIds: [element.id],
      });
    }

    return diagnostics;
  },
};
