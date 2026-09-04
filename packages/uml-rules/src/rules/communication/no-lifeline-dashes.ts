import { createId } from "@graphiq/uml-core";
import type { Diagnostic } from "@graphiq/uml-core";
import type { UmlModel } from "@graphiq/uml-model";
import type { UmlRule } from "../../types.js";

const RULE_ID = "comm.no-lifeline-dashes";

export const communicationNoLifelineDashesRule: UmlRule = {
  id: RULE_ID,
  diagramKinds: ["communication"],
  severity: "error",
  check(model: UmlModel): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    for (const element of model.elements) {
      if (element.elementType !== "lifeline") {
        continue;
      }

      diagnostics.push({
        id: createId(),
        ruleId: RULE_ID,
        severity: "error",
        message: "Communication diagrams use instance rectangles, not sequence lifelines",
        elementIds: [element.id],
      });
    }

    return diagnostics;
  },
};
