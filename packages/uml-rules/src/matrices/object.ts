import type { ElementType } from "@graphiq/uml-model";
import type { ConnectorTriple } from "../types.js";

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

const INSTANCE = ["instanceSpecification"] as const satisfies readonly ElementType[];

export const OBJECT_CONNECTORS: readonly ConnectorTriple[] = [
  ...cartesian("link", INSTANCE, INSTANCE),
  ...cartesian("dependency", INSTANCE, INSTANCE),
];
