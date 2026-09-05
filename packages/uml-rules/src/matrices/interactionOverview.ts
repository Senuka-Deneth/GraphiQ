import type { ElementType } from "@graphiq/uml-model";
import type { ConnectorTriple } from "../types.js";

const OVERVIEW_FLOW_NODES: readonly ElementType[] = [
  "initialNode",
  "activityFinalNode",
  "decisionNode",
  "mergeNode",
  "forkNode",
  "joinNode",
  "interactionUse",
];

function cartesian(
  relationship: ConnectorTriple["relationship"],
  sources: readonly ElementType[],
  targets: readonly ElementType[],
): ConnectorTriple[] {
  const triples: ConnectorTriple[] = [];
  for (const source of sources) {
    for (const target of targets) {
      triples.push({ relationship, source, target });
    }
  }
  return triples;
}

export const INTERACTION_OVERVIEW_CONNECTORS: readonly ConnectorTriple[] = cartesian(
  "controlFlow",
  OVERVIEW_FLOW_NODES,
  OVERVIEW_FLOW_NODES,
);
