import type { DiagramKind } from "@graphiq/uml-core";
import type { ElementType, RelationshipType } from "@graphiq/uml-model";
import { getConnectorMatrix } from "./matrices/index.js";
import type { ConnectorKey } from "./types.js";

function tripleKey(
  relationship: RelationshipType,
  source: ElementType,
  target: ElementType,
): string {
  return `${relationship}\n${source}\n${target}`;
}

function buildConnectorSet(
  kind: DiagramKind,
): ReadonlySet<string> {
  const matrix = getConnectorMatrix(kind);
  return new Set(
    matrix.map((triple) =>
      tripleKey(triple.relationship, triple.source, triple.target),
    ),
  );
}

const connectorSets = new Map<DiagramKind, ReadonlySet<string>>();

function getConnectorSet(kind: DiagramKind): ReadonlySet<string> {
  let set = connectorSets.get(kind);
  if (!set) {
    set = buildConnectorSet(kind);
    connectorSets.set(kind, set);
  }
  return set;
}

export function isConnectorAllowed(key: ConnectorKey): boolean {
  const lookupKey = tripleKey(key.relationship, key.source, key.target);
  return getConnectorSet(key.kind).has(lookupKey);
}
