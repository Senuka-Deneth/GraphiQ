import { createId } from "@graphiq/uml-core";
import type { Diagnostic } from "@graphiq/uml-core";
import type { UmlModel } from "@graphiq/uml-model";
import type { UmlRule } from "../../types.js";

const RULE_ID = "pkg.no-cycle-merge";

function findMergeCycle(
  model: UmlModel,
): { relationshipIds: string[]; elementIds: string[] } | null {
  const mergeEdges = model.relationships.filter(
    (relationship) => relationship.relationshipType === "packageMerge",
  );

  const adjacency = new Map<string, string[]>();
  for (const edge of mergeEdges) {
    const next = adjacency.get(edge.sourceId) ?? [];
    next.push(edge.targetId);
    adjacency.set(edge.sourceId, next);
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();
  const stack: string[] = [];
  let cycle: string[] | null = null;

  function dfs(nodeId: string): boolean {
    visiting.add(nodeId);
    stack.push(nodeId);

    for (const nextId of adjacency.get(nodeId) ?? []) {
      if (visiting.has(nextId)) {
        const startIndex = stack.indexOf(nextId);
        cycle = startIndex >= 0 ? stack.slice(startIndex) : [nextId, nodeId];
        return true;
      }
      if (!visited.has(nextId) && dfs(nextId)) {
        return true;
      }
    }

    stack.pop();
    visiting.delete(nodeId);
    visited.add(nodeId);
    return false;
  }

  for (const element of model.elements) {
    if (element.elementType === "package" && !visited.has(element.id) && dfs(element.id)) {
      break;
    }
  }

  if (cycle === null) {
    return null;
  }

  const cycleSet = new Set(cycle);
  const relationshipIds = mergeEdges
    .filter((edge) => cycleSet.has(edge.sourceId) && cycleSet.has(edge.targetId))
    .map((edge) => edge.id);

  return {
    relationshipIds,
    elementIds: [...cycle, ...relationshipIds],
  };
}

export const packageNoCycleMergeRule: UmlRule = {
  id: RULE_ID,
  diagramKinds: ["package"],
  severity: "error",
  check(model: UmlModel): Diagnostic[] {
    const cycle = findMergeCycle(model);
    if (cycle === null) {
      return [];
    }

    return [
      {
        id: createId(),
        ruleId: RULE_ID,
        severity: "error",
        message: "Package merge graph must be acyclic",
        elementIds: cycle.elementIds,
      },
    ];
  },
};
