import { createId } from "@graphiq/uml-core";
import type { Diagnostic } from "@graphiq/uml-core";
import type { UmlModel } from "@graphiq/uml-model";
import type { UmlRule } from "../../types.js";

const RULE_ID = "comm.message-has-sequence-number";

export const communicationMessageHasSequenceNumberRule: UmlRule = {
  id: RULE_ID,
  diagramKinds: ["communication"],
  severity: "error",
  check(model: UmlModel): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    for (const relationship of model.relationships) {
      if (relationship.relationshipType !== "message") {
        continue;
      }

      if (
        relationship.sequenceNumber === undefined ||
        relationship.sequenceNumber.trim().length === 0
      ) {
        diagnostics.push({
          id: createId(),
          ruleId: RULE_ID,
          severity: "error",
          message: "Communication messages must include a sequence number",
          elementIds: [relationship.id],
        });
      }
    }

    return diagnostics;
  },
};
