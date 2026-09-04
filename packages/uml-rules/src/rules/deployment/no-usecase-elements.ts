import { createId } from "@graphiq/uml-core";
import type { Diagnostic } from "@graphiq/uml-core";
import type { ElementType, UmlModel } from "@graphiq/uml-model";
import type { UmlRule } from "../../types.js";

const RULE_ID = "dep.no-usecase-elements";

const FORBIDDEN = new Set<ElementType>(["actor", "useCase", "subject"]);

export const deploymentNoUseCaseElementsRule: UmlRule = {
  id: RULE_ID,
  diagramKinds: ["deployment"],
  severity: "error",
  check(model: UmlModel): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    for (const element of model.elements) {
      if (!FORBIDDEN.has(element.elementType)) {
        continue;
      }

      diagnostics.push({
        id: createId(),
        ruleId: RULE_ID,
        severity: "error",
        message: `Element type "${element.elementType}" cannot appear on a deployment diagram`,
        elementIds: [element.id],
      });
    }

    return diagnostics;
  },
};
