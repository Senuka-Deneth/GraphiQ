import type { ElementType } from "@graphiq/uml-model";
import type { ConnectorTriple } from "../types.js";

const CONTROL_FLOW_NODES: readonly ElementType[] = [
  "action",
  "initialNode",
  "activityFinalNode",
  "flowFinalNode",
  "decisionNode",
  "mergeNode",
  "forkNode",
  "joinNode",
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

export const ACTIVITY_CONNECTORS: readonly ConnectorTriple[] = [
  ...cartesian("controlFlow", CONTROL_FLOW_NODES, CONTROL_FLOW_NODES),
  { relationship: "objectFlow", source: "objectNode", target: "action" },
  { relationship: "objectFlow", source: "action", target: "objectNode" },
  { relationship: "objectFlow", source: "objectNode", target: "objectNode" },
];
