import { createId } from "@graphiq/uml-core";
import type { Diagnostic } from "@graphiq/uml-core";
import type { UmlModel } from "@graphiq/uml-model";
import type { UmlRule } from "../../types.js";

const RULE_ID = "sd.message-between-lifelines-or-gates";

const ALLOWED_ENDPOINTS = new Set(["lifeline", "gate"]);

export const sequenceMessageBetweenLifelinesOrGatesRule: UmlRule = {
  id: RULE_ID,
  diagramKinds: ["sequence"],
  severity: "error",
  check(model: UmlModel): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    for (const relationship of model.relationships) {
      if (relationship.relationshipType !== "message") {
        continue;
      }

      const source = model.elements.find((element) => element.id === relationship.sourceId);
      const target = model.elements.find((element) => element.id === relationship.targetId);

      if (
        source === undefined ||
        target === undefined ||
        !ALLOWED_ENDPOINTS.has(source.elementType) ||
        (target.elementType !== "destructionOccurrence" &&
          !ALLOWED_ENDPOINTS.has(target.elementType))
      ) {
        diagnostics.push({
          id: createId(),
          ruleId: RULE_ID,
          severity: "error",
          message: "Sequence messages must connect lifelines or gates",
          elementIds: [relationship.id, relationship.sourceId, relationship.targetId],
        });
      }
    }

    return diagnostics;
  },
};
