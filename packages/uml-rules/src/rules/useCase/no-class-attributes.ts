import { createId } from "@graphiq/uml-core";
import type { Diagnostic } from "@graphiq/uml-core";
import type { ElementType, UmlModel } from "@graphiq/uml-model";
import type { UmlRule } from "../../types.js";

const RULE_ID = "uc.no-class-attributes";

const FORBIDDEN_ELEMENT_TYPES = new Set<ElementType>([
  "class",
  "interface",
  "dataType",
  "enumeration",
  "primitiveType",
  "associationClass",
  "node",
  "device",
  "executionEnvironment",
  "state",
  "lifeline",
  "component",
  "artifact",
]);

export const useCaseNoClassAttributesRule: UmlRule = {
  id: RULE_ID,
  diagramKinds: ["useCase"],
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
        message: `Element type "${element.elementType}" cannot appear on a use case diagram`,
        elementIds: [element.id],
      });
    }

    return diagnostics;
  },
};
