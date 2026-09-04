import type { ElementType } from "@graphiq/uml-model";
import type { ConnectorTriple } from "../types.js";

const ENDPOINTS: readonly ElementType[] = ["part", "port"];
const FRAME_TYPES: readonly ElementType[] = ["class", "component", "collaboration"];
const DEPENDENCY_ENDPOINTS: readonly ElementType[] = [...FRAME_TYPES, ...ENDPOINTS];

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

export const COMPOSITE_STRUCTURE_CONNECTORS: readonly ConnectorTriple[] = [
  ...cartesian("connector", ENDPOINTS, ENDPOINTS),
  ...cartesian("assemblyConnector", ENDPOINTS, ENDPOINTS),
  ...cartesian("dependency", DEPENDENCY_ENDPOINTS, DEPENDENCY_ENDPOINTS),
];
