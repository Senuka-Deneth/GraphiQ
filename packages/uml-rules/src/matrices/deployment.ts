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

const NODEISH = [
  "node",
  "device",
  "executionEnvironment",
] as const satisfies readonly ElementType[];

const ARTIFACT = ["artifact"] as const satisfies readonly ElementType[];

export const DEPLOYMENT_CONNECTORS: readonly ConnectorTriple[] = [
  ...cartesian("communicationPath", NODEISH, NODEISH),
  ...cartesian("deployment", ARTIFACT, NODEISH),
  ...cartesian("generalization", NODEISH, NODEISH),
];
