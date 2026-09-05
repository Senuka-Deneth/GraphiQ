import { createId } from "@graphiq/uml-core";
import type { Diagnostic } from "@graphiq/uml-core";
import type { ElementType, UmlModel } from "@graphiq/uml-model";
import type { UmlRule } from "../../types.js";

const RULE_ID = "io.flow-activity-like";

const OVERVIEW_NODES: ReadonlySet<ElementType> = new Set([
  "initialNode",
  "activityFinalNode",
  "decisionNode",
  "mergeNode",
  "forkNode",
  "joinNode",
  "interactionUse",
]);

export const interactionOverviewFlowActivityLikeRule: UmlRule = {
  id: RULE_ID,
  diagramKinds: ["interactionOverview"],
  severity: "error",
  check(model: UmlModel): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    for (const relationship of model.relationships) {
      if (relationship.relationshipType !== "controlFlow") {
        continue;
      }

      const source = model.elements.find((element) => element.id === relationship.sourceId);
      const target = model.elements.find((element) => element.id === relationship.targetId);
      if (!source || !target) {
        continue;
      }

      if (!OVERVIEW_NODES.has(source.elementType) || !OVERVIEW_NODES.has(target.elementType)) {
        diagnostics.push({
          id: createId(),
          ruleId: RULE_ID,
          severity: "error",
          message:
            "Control flow must connect interaction-overview nodes, not notes or foreign elements",
          elementIds: [relationship.id, source.id, target.id],
        });
      }
    }

    for (const element of model.elements) {
      if (element.elementType === "initialNode") {
        const incoming = model.relationships.filter(
          (relationship) =>
            relationship.relationshipType === "controlFlow" &&
            relationship.targetId === element.id,
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

      if (element.elementType === "activityFinalNode") {
        const outgoing = model.relationships.filter(
          (relationship) =>
            relationship.relationshipType === "controlFlow" &&
            relationship.sourceId === element.id,
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
    }

    return diagnostics;
  },
};
