import { createId } from "@graphiq/uml-core";
import type { Diagnostic } from "@graphiq/uml-core";
import type { UmlModel } from "@graphiq/uml-model";
import type { UmlRule } from "../../types.js";

const RULE_ID = "tm.state-belongs-to-lifeline";

export const timingStateBelongsToLifelineRule: UmlRule = {
  id: RULE_ID,
  diagramKinds: ["timing"],
  severity: "error",
  check(model: UmlModel): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];
    const lifelineIds = new Set(
      model.elements
        .filter((element) => element.elementType === "lifeline")
        .map((element) => element.id),
    );

    for (const element of model.elements) {
      if (element.elementType !== "timingState") {
        continue;
      }

      if (element.parentId === undefined || !lifelineIds.has(element.parentId)) {
        diagnostics.push({
          id: createId(),
          ruleId: RULE_ID,
          severity: "error",
          message: "Timing state must belong to a lifeline on the diagram",
          elementIds: [element.id],
        });
      }
    }

    return diagnostics;
  },
};
