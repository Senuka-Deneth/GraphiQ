import { createId } from "@graphiq/uml-core";
import type { Diagnostic } from "@graphiq/uml-core";
import type { ElementType, UmlModel } from "@graphiq/uml-model";
import type { UmlRule } from "../../types.js";

const RULE_ID = "sm.transition-between-vertices-of-same-machine";

const VERTEX_TYPES: ReadonlySet<ElementType> = new Set([
  "state",
  "pseudostate",
  "finalState",
]);

export const stateMachineTransitionBetweenVerticesRule: UmlRule = {
  id: RULE_ID,
  diagramKinds: ["stateMachine"],
  severity: "error",
  check(model: UmlModel): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    for (const relationship of model.relationships) {
      if (relationship.relationshipType !== "transition") {
        continue;
      }

      const source = model.elements.find((element) => element.id === relationship.sourceId);
      const target = model.elements.find((element) => element.id === relationship.targetId);
      if (!source || !target) {
        continue;
      }

      if (
        !VERTEX_TYPES.has(source.elementType) ||
        !VERTEX_TYPES.has(target.elementType)
      ) {
        diagnostics.push({
          id: createId(),
          ruleId: RULE_ID,
          severity: "error",
          message:
            "Transitions must connect state-machine vertices (state, pseudostate, or final state)",
          elementIds: [relationship.id, source.id, target.id],
        });
      }
    }

    return diagnostics;
  },
};
