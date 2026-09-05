import { createId } from "@graphiq/uml-core";
import type { Diagnostic } from "@graphiq/uml-core";
import { isTransitionRelationship, type UmlModel } from "@graphiq/uml-model";
import type { UmlRule } from "../../types.js";

const RULE_ID = "sm.initial-one-outgoing-no-trigger";

export const stateMachineInitialOneOutgoingNoTriggerRule: UmlRule = {
  id: RULE_ID,
  diagramKinds: ["stateMachine"],
  severity: "error",
  check(model: UmlModel): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    for (const element of model.elements) {
      if (element.elementType !== "pseudostate" || element.kind !== "initial") {
        continue;
      }

      const outgoing = model.relationships.filter(
        (relationship) =>
          isTransitionRelationship(relationship) && relationship.sourceId === element.id,
      );

      if (outgoing.length !== 1) {
        diagnostics.push({
          id: createId(),
          ruleId: RULE_ID,
          severity: "error",
          message: "An initial pseudostate must have exactly one outgoing transition",
          elementIds: [element.id, ...outgoing.map((relationship) => relationship.id)],
        });
        continue;
      }

      const transition = outgoing[0];
      if (
        transition !== undefined &&
        isTransitionRelationship(transition) &&
        transition.trigger !== undefined
      ) {
        diagnostics.push({
          id: createId(),
          ruleId: RULE_ID,
          severity: "error",
          message: "The outgoing transition from an initial pseudostate must not have a trigger",
          elementIds: [element.id, transition.id],
        });
      }
    }

    return diagnostics;
  },
};
