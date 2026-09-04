import { createId } from "@graphiq/uml-core";
import type { Diagnostic } from "@graphiq/uml-core";
import { isActivityFlowRelationship, type UmlModel } from "@graphiq/uml-model";
import type { UmlRule } from "../../types.js";

const RULE_ID = "act.final-no-outgoing";

export const activityFinalNoOutgoingRule: UmlRule = {
  id: RULE_ID,
  diagramKinds: ["activity"],
  severity: "error",
  check(model: UmlModel): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    for (const element of model.elements) {
      if (
        element.elementType !== "activityFinalNode" &&
        element.elementType !== "flowFinalNode"
      ) {
        continue;
      }

      const outgoing = model.relationships.filter(
        (relationship) =>
          isActivityFlowRelationship(relationship) && relationship.sourceId === element.id,
      );

      if (outgoing.length > 0) {
        diagnostics.push({
          id: createId(),
          ruleId: RULE_ID,
          severity: "error",
          message: "A final node cannot have outgoing flows",
          elementIds: [element.id, ...outgoing.map((relationship) => relationship.id)],
        });
      }
    }

    return diagnostics;
  },
};
