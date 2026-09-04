import type { ElementType } from "@graphiq/uml-model";
import type { ConnectorTriple } from "../types.js";

const CLASSIFIER_ELEMENT_TYPES: readonly ElementType[] = [
  "class",
  "interface",
  "dataType",
  "enumeration",
  "primitiveType",
  "associationClass",
];

const GENERALIZATION_ELEMENT_TYPES: readonly ElementType[] = [
  "class",
  "interface",
  "dataType",
  "enumeration",
  "primitiveType",
];

const WHOLE_PART_ELEMENT_TYPES: readonly ElementType[] = [
  "class",
  "associationClass",
];

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

function sameTypePairs(
  relationship: ConnectorTriple["relationship"],
  elementTypes: readonly ElementType[],
): ConnectorTriple[] {
  return elementTypes.map((elementType) => ({
    relationship,
    source: elementType,
    target: elementType,
  }));
}

export const CLASS_CONNECTORS: readonly ConnectorTriple[] = [
  ...sameTypePairs("generalization", GENERALIZATION_ELEMENT_TYPES),
  ...cartesian("realization", ["class"], ["interface"]),
  ...cartesian("interfaceRealization", ["class"], ["interface"]),
  ...cartesian("association", CLASSIFIER_ELEMENT_TYPES, CLASSIFIER_ELEMENT_TYPES),
  ...cartesian(
    "navigableAssociation",
    CLASSIFIER_ELEMENT_TYPES,
    CLASSIFIER_ELEMENT_TYPES,
  ),
  ...cartesian(
    "aggregation",
    WHOLE_PART_ELEMENT_TYPES,
    WHOLE_PART_ELEMENT_TYPES,
  ),
  ...cartesian(
    "composition",
    WHOLE_PART_ELEMENT_TYPES,
    WHOLE_PART_ELEMENT_TYPES,
  ),
  ...cartesian("dependency", CLASSIFIER_ELEMENT_TYPES, CLASSIFIER_ELEMENT_TYPES),
  ...cartesian("usage", CLASSIFIER_ELEMENT_TYPES, CLASSIFIER_ELEMENT_TYPES),
  ...cartesian("nestedClassifier", ["class"], [
    "class",
    "interface",
    "enumeration",
    "dataType",
    "primitiveType",
  ]),
];
