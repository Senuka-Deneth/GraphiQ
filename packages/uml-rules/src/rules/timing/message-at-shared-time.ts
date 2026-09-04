import { createId } from "@graphiq/uml-core";
import type { Diagnostic } from "@graphiq/uml-core";
import {
  intervalCoversTime,
  timingIntervalsForLifeline,
  type UmlModel,
} from "@graphiq/uml-model";
import type { UmlRule } from "../../types.js";

const RULE_ID = "tm.message-at-shared-time";

export const timingMessageAtSharedTimeRule: UmlRule = {
  id: RULE_ID,
  diagramKinds: ["timing"],
  severity: "error",
  check(model: UmlModel): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    for (const relationship of model.relationships) {
      if (relationship.relationshipType !== "message") {
        continue;
      }

      if (relationship.time === undefined) {
        diagnostics.push({
          id: createId(),
          ruleId: RULE_ID,
          severity: "error",
          message: "Timing diagram messages must specify a time with @",
          elementIds: [relationship.id, relationship.sourceId, relationship.targetId],
        });
        continue;
      }

      const time = relationship.time;
      const sourceIntervals = timingIntervalsForLifeline(model, relationship.sourceId);
      const targetIntervals = timingIntervalsForLifeline(model, relationship.targetId);

      const sourceCovers = sourceIntervals.some((interval) =>
        intervalCoversTime(interval, time),
      );
      const targetCovers = targetIntervals.some((interval) =>
        intervalCoversTime(interval, time),
      );

      if (!sourceCovers || !targetCovers) {
        diagnostics.push({
          id: createId(),
          ruleId: RULE_ID,
          severity: "error",
          message: `Message at time ${time} is not covered by both lifeline intervals`,
          elementIds: [relationship.id, relationship.sourceId, relationship.targetId],
        });
      }
    }

    return diagnostics;
  },
};
