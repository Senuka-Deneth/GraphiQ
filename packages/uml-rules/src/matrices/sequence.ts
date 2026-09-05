import type { ElementType } from "@graphiq/uml-model";
import type { ConnectorTriple } from "../types.js";

const MESSAGE_ENDPOINTS: readonly ElementType[] = ["lifeline", "gate"];

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

export const SEQUENCE_CONNECTORS: readonly ConnectorTriple[] = [
  ...cartesian("message", MESSAGE_ENDPOINTS, MESSAGE_ENDPOINTS),
  { relationship: "message", source: "lifeline", target: "destructionOccurrence" },
];
