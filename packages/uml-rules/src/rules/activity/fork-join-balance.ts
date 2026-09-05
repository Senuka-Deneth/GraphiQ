import { createId } from "@graphiq/uml-core";
import type { Diagnostic } from "@graphiq/uml-core";
import { isActivityFlowRelationship, type UmlModel } from "@graphiq/uml-model";
import type { UmlRule } from "../../types.js";

const RULE_ID = "act.fork-join-balance";

function outgoingCount(model: UmlModel, elementId: string): number {
  return model.relationships.filter(
    (relationship) =>
      isActivityFlowRelationship(relationship) && relationship.sourceId === elementId,
  ).length;
}

function incomingCount(model: UmlModel, elementId: string): number {
  return model.relationships.filter(
    (relationship) =>
      isActivityFlowRelationship(relationship) && relationship.targetId === elementId,
  ).length;
}

function neighborsFrom(model: UmlModel, elementId: string): string[] {
  return model.relationships
    .filter(
      (relationship) =>
        isActivityFlowRelationship(relationship) && relationship.sourceId === elementId,
    )
    .map((relationship) => relationship.targetId);
}

function reachableJoinIds(model: UmlModel, forkId: string): string[] {
  const visited = new Set<string>([forkId]);
  const queue = [...neighborsFrom(model, forkId)];
  const joins: string[] = [];

  while (queue.length > 0) {
    const currentId = queue.shift();
    if (currentId === undefined || visited.has(currentId)) {
      continue;
    }
    visited.add(currentId);

    const current = model.elements.find((element) => element.id === currentId);
    if (current?.elementType === "joinNode") {
      joins.push(currentId);
    }

    for (const nextId of neighborsFrom(model, currentId)) {
      if (!visited.has(nextId)) {
        queue.push(nextId);
      }
    }
  }

  return joins;
}

export const activityForkJoinBalanceRule: UmlRule = {
  id: RULE_ID,
  diagramKinds: ["activity"],
  severity: "warning",
  check(model: UmlModel): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    for (const element of model.elements) {
      if (element.elementType !== "forkNode") {
        continue;
      }

      const forkOutgoing = outgoingCount(model, element.id);
      if (forkOutgoing < 2) {
        continue;
      }

      const matchingJoin = reachableJoinIds(model, element.id).find(
        (joinId) => incomingCount(model, joinId) === forkOutgoing,
      );

      if (matchingJoin === undefined) {
        diagnostics.push({
          id: createId(),
          ruleId: RULE_ID,
          severity: "warning",
          message: `Fork "${element.name}" has ${forkOutgoing} outgoing flows without a matching join`,
          elementIds: [element.id],
        });
      }
    }

    return diagnostics;
  },
};
