import { createId } from "@graphiq/uml-core";
import type { Diagnostic } from "@graphiq/uml-core";
import type { UmlModel } from "@graphiq/uml-model";
import type { UmlRule } from "../../types.js";

const RULE_ID = "comm.number-unique-in-interaction";

export const communicationNumberUniqueRule: UmlRule = {
  id: RULE_ID,
  diagramKinds: ["communication"],
  severity: "error",
  check(model: UmlModel): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];
    const seen = new Map<string, string>();

    for (const relationship of model.relationships) {
      if (relationship.relationshipType !== "message") {
        continue;
      }

      const sequenceNumber = relationship.sequenceNumber;
      if (sequenceNumber === undefined) {
        continue;
      }

      const previousId = seen.get(sequenceNumber);
      if (previousId !== undefined) {
        diagnostics.push({
          id: createId(),
          ruleId: RULE_ID,
          severity: "error",
          message: `Sequence number "${sequenceNumber}" is already used by another message`,
          elementIds: [relationship.id, previousId],
        });
        continue;
      }

      seen.set(sequenceNumber, relationship.id);
    }

    return diagnostics;
  },
};
