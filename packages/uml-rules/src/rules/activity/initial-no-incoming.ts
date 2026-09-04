import { createId } from "@graphiq/uml-core";
import type { Diagnostic } from "@graphiq/uml-core";
import { isActivityFlowRelationship, type UmlModel } from "@graphiq/uml-model";
import type { UmlRule } from "../../types.js";

const RULE_ID = "act.initial-no-incoming";

export const activityInitialNoIncomingRule: UmlRule = {
  id: RULE_ID,
  diagramKinds: ["activity"],
  severity: "error",
  check(model: UmlModel): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    for (const element of model.elements) {
      if (element.elementType !== "initialNode") {
        continue;
      }

      const incoming = model.relationships.filter(
        (relationship) =>
          isActivityFlowRelationship(relationship) && relationship.targetId === element.id,
      );

      if (incoming.length > 0) {
        diagnostics.push({
          id: createId(),
          ruleId: RULE_ID,
          severity: "error",
          message: "An initial node cannot have incoming flows",
          elementIds: [element.id, ...incoming.map((relationship) => relationship.id)],
        });
      }
    }

    return diagnostics;
  },
};
