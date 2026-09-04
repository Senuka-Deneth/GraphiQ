import { createId } from "@graphiq/uml-core";
import type { Diagnostic } from "@graphiq/uml-core";
import type { UmlModel } from "@graphiq/uml-model";
import type { UmlRule } from "../../types.js";

const RULE_ID = "cmp.no-actor";

export const componentNoActorRule: UmlRule = {
  id: RULE_ID,
  diagramKinds: ["component"],
  severity: "error",
  check(model: UmlModel): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    for (const element of model.elements) {
      if (element.elementType !== "actor") {
        continue;
      }

      diagnostics.push({
        id: createId(),
        ruleId: RULE_ID,
        severity: "error",
        message: "Actor cannot appear on a component diagram",
        elementIds: [element.id],
      });
    }

    return diagnostics;
  },
};
