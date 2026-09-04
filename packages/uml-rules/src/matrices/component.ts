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

const COMPONENT = ["component"] as const satisfies readonly ElementType[];
const INTERFACE = ["interface"] as const satisfies readonly ElementType[];
const PORT = ["port"] as const satisfies readonly ElementType[];
const DEPENDENCY_ENDS = [
  "component",
  "interface",
  "artifact",
] as const satisfies readonly ElementType[];

export const COMPONENT_CONNECTORS: readonly ConnectorTriple[] = [
  ...cartesian("interfaceRealization", COMPONENT, INTERFACE),
  ...cartesian("usage", COMPONENT, INTERFACE),
  ...cartesian("assemblyConnector", INTERFACE, INTERFACE),
  ...cartesian("assemblyConnector", PORT, PORT),
  ...cartesian("assemblyConnector", PORT, INTERFACE),
  ...cartesian("assemblyConnector", INTERFACE, PORT),
  ...cartesian("delegationConnector", PORT, PORT),
  ...cartesian("delegationConnector", PORT, INTERFACE),
  ...cartesian("delegationConnector", INTERFACE, PORT),
  ...cartesian("dependency", DEPENDENCY_ENDS, DEPENDENCY_ENDS),
  ...cartesian("componentRealization", COMPONENT, COMPONENT),
];
