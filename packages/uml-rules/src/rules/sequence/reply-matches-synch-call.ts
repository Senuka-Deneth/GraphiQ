import { createId } from "@graphiq/uml-core";
import type { Diagnostic } from "@graphiq/uml-core";
import type { UmlModel } from "@graphiq/uml-model";
import type { UmlRule } from "../../types.js";

const RULE_ID = "sd.reply-matches-synch-call";

export const sequenceReplyMatchesSynchCallRule: UmlRule = {
  id: RULE_ID,
  diagramKinds: ["sequence"],
  severity: "error",
  check(model: UmlModel): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];
    const unmatchedSynchCalls: { id: string; sourceId: string; targetId: string }[] = [];

    for (const relationship of model.relationships) {
      if (relationship.relationshipType !== "message") {
        continue;
      }

      if (relationship.messageSort === "synchCall") {
        unmatchedSynchCalls.push({
          id: relationship.id,
          sourceId: relationship.sourceId,
          targetId: relationship.targetId,
        });
        continue;
      }

      if (relationship.messageSort !== "reply") {
        continue;
      }

      const matchIndex = unmatchedSynchCalls.findIndex(
        (candidate) =>
          candidate.sourceId === relationship.targetId &&
          candidate.targetId === relationship.sourceId,
      );

      if (matchIndex === -1) {
        diagnostics.push({
          id: createId(),
          ruleId: RULE_ID,
          severity: "error",
          message: "Reply message has no matching earlier synchronous call",
          elementIds: [relationship.id],
        });
        continue;
      }

      unmatchedSynchCalls.splice(matchIndex, 1);
    }

    return diagnostics;
  },
};
