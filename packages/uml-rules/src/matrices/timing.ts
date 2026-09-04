import type { ElementType } from "@graphiq/uml-model";
import type { ConnectorTriple } from "../types.js";

const MESSAGE_ENDPOINTS: readonly ElementType[] = ["lifeline"];

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

export const TIMING_CONNECTORS: readonly ConnectorTriple[] = cartesian(
  "message",
  MESSAGE_ENDPOINTS,
  MESSAGE_ENDPOINTS,
);
