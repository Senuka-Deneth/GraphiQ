import { createId } from "@graphiq/uml-core";
import type { Diagnostic } from "@graphiq/uml-core";
import { isClassifierElement, type UmlModel } from "@graphiq/uml-model";
import type { UmlRule } from "../../types.js";

const RULE_ID = "tm.no-class-operations-compartment";

export const timingNoClassOperationsCompartmentRule: UmlRule = {
  id: RULE_ID,
  diagramKinds: ["timing"],
  severity: "error",
  check(model: UmlModel): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    for (const element of model.elements) {
      if (!isClassifierElement(element)) {
        continue;
      }

      diagnostics.push({
        id: createId(),
        ruleId: RULE_ID,
        severity: "error",
        message: "Classifiers with compartments cannot appear on a timing diagram",
        elementIds: [element.id],
      });
    }

    return diagnostics;
  },
};
