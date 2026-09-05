import { createId } from "@graphiq/uml-core";
import type { Diagnostic } from "@graphiq/uml-core";
import { isActivityFlowRelationship, type UmlModel } from "@graphiq/uml-model";
import type { UmlRule } from "../../types.js";

const RULE_ID = "act.decision-has-guards-on-outgoing";

export const activityDecisionHasGuardsOnOutgoingRule: UmlRule = {
  id: RULE_ID,
  diagramKinds: ["activity"],
  severity: "warning",
  check(model: UmlModel): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    for (const element of model.elements) {
      if (element.elementType !== "decisionNode") {
        continue;
      }

      for (const relationship of model.relationships) {
        if (!isActivityFlowRelationship(relationship) || relationship.sourceId !== element.id) {
          continue;
        }

        const guard = relationship.guard;
        if (guard === undefined || guard.trim().length === 0) {
          diagnostics.push({
            id: createId(),
            ruleId: RULE_ID,
            severity: "warning",
            message: `Outgoing flow from decision "${element.name}" should have a guard`,
            elementIds: [relationship.id, element.id],
          });
        }
      }
    }

    return diagnostics;
  },
};
