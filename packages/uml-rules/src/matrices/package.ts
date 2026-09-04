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

const PACKAGE = ["package"] as const satisfies readonly ElementType[];
const PACKAGEABLE = [
  "class",
  "interface",
  "enumeration",
  "dataType",
  "primitiveType",
] as const satisfies readonly ElementType[];

export const PACKAGE_CONNECTORS: readonly ConnectorTriple[] = [
  ...cartesian("packageImport", PACKAGE, PACKAGE),
  ...cartesian("packageMerge", PACKAGE, PACKAGE),
  ...cartesian("dependency", PACKAGE, PACKAGE),
  ...cartesian("containment", PACKAGE, PACKAGE),
  ...cartesian("containment", PACKAGE, PACKAGEABLE),
];
