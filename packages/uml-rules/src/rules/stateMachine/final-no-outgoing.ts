import { createId } from "@graphiq/uml-core";
import type { Diagnostic } from "@graphiq/uml-core";
import type { UmlModel } from "@graphiq/uml-model";
import type { UmlRule } from "../../types.js";

const RULE_ID = "sm.final-no-outgoing";

export const stateMachineFinalNoOutgoingRule: UmlRule = {
  id: RULE_ID,
  diagramKinds: ["stateMachine"],
  severity: "error",
  check(model: UmlModel): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    for (const element of model.elements) {
      if (element.elementType !== "finalState") {
        continue;
      }

      const outgoing = model.relationships.filter(
        (relationship) =>
          relationship.relationshipType === "transition" &&
          relationship.sourceId === element.id,
      );

      if (outgoing.length > 0) {
        diagnostics.push({
          id: createId(),
          ruleId: RULE_ID,
          severity: "error",
          message: "A final state cannot have outgoing transitions",
          elementIds: [element.id, ...outgoing.map((relationship) => relationship.id)],
        });
      }
    }

    return diagnostics;
  },
};
