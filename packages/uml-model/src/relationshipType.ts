export const RELATIONSHIP_TYPES = [
  "association",
  "navigableAssociation",
  "aggregation",
  "composition",
  "generalization",
  "realization",
  "interfaceRealization",
  "dependency",
  "usage",
  "nestedClassifier",
  "link",
  "packageImport",
  "packageMerge",
  "containment",
  "connector",
  "assemblyConnector",
  "delegationConnector",
  "componentRealization",
  "deployment",
  "communicationPath",
  "manifestation",
  "extension",
  "include",
  "extend",
  "controlFlow",
  "objectFlow",
  "transition",
  "message",
] as const;

export type RelationshipType = (typeof RELATIONSHIP_TYPES)[number];

const relationshipTypeSet = new Set<string>(RELATIONSHIP_TYPES);

export function isRelationshipType(value: string): value is RelationshipType {
  return relationshipTypeSet.has(value);
}
