import type { ElementType } from "@graphiq/uml-model";
import type { ConnectorTriple } from "../types.js";

const VERTEX_TYPES: readonly ElementType[] = ["state", "pseudostate", "finalState"];

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

export const STATE_MACHINE_CONNECTORS: readonly ConnectorTriple[] = cartesian(
  "transition",
  VERTEX_TYPES,
  VERTEX_TYPES,
);
