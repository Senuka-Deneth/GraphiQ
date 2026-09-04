import { createId } from "@graphiq/uml-core";
import type { Diagnostic } from "@graphiq/uml-core";
import type { UmlModel } from "@graphiq/uml-model";
import type { UmlRule } from "../../types.js";

const RULE_ID = "sd.combined-fragment-operands-nonempty";

export const sequenceCombinedFragmentOperandsNonemptyRule: UmlRule = {
  id: RULE_ID,
  diagramKinds: ["sequence"],
  severity: "error",
  check(model: UmlModel): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    for (const element of model.elements) {
      if (element.elementType !== "combinedFragment") {
        continue;
      }

      if (element.operands.length === 0) {
        diagnostics.push({
          id: createId(),
          ruleId: RULE_ID,
          severity: "error",
          message: "Combined fragments must have at least one operand",
          elementIds: [element.id],
        });
        continue;
      }

      for (const [index, operand] of element.operands.entries()) {
        if (operand.messageIds.length === 0) {
          diagnostics.push({
            id: createId(),
            ruleId: RULE_ID,
            severity: "error",
            message: `Combined fragment operand ${index + 1} must contain at least one message`,
            elementIds: [element.id],
          });
        }
      }
    }

    return diagnostics;
  },
};
