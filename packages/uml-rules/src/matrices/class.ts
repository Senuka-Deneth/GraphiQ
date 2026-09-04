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

const REALIZATION_SOURCE_TYPES: readonly ElementType[] = [
  "class",
  "associationClass",
];

function triplesForPairs(
  relationship: ConnectorTriple["relationship"],
  elementTypes: readonly ElementType[],
  sameTypeOnly = false,
): ConnectorTriple[] {
  const triples: ConnectorTriple[] = [];

  for (const source of elementTypes) {
    for (const target of elementTypes) {
      if (sameTypeOnly && source !== target) {
        continue;
      }
      triples.push({ relationship, source, target });
    }
  }

  return triples;
}

function triplesFromSource(
  relationship: ConnectorTriple["relationship"],
  source: ElementType,
  targets: readonly ElementType[],
): ConnectorTriple[] {
  return targets.map((target) => ({ relationship, source, target }));
}

export const CLASS_CONNECTORS: readonly ConnectorTriple[] = [
  ...triplesForPairs("generalization", GENERALIZATION_ELEMENT_TYPES, true),
  ...REALIZATION_SOURCE_TYPES.flatMap((source) =>
    triplesFromSource("realization", source, ["interface"]),
  ),
  ...REALIZATION_SOURCE_TYPES.flatMap((source) =>
    triplesFromSource("interfaceRealization", source, ["interface"]),
  ),
  ...triplesForPairs("association", CLASSIFIER_ELEMENT_TYPES),
  ...triplesForPairs("navigableAssociation", CLASSIFIER_ELEMENT_TYPES),
  ...triplesForPairs("aggregation", ["class"]),
  ...triplesForPairs("composition", ["class"]),
  ...triplesForPairs("dependency", CLASSIFIER_ELEMENT_TYPES),
  ...triplesForPairs("usage", CLASSIFIER_ELEMENT_TYPES),
  ...triplesFromSource("nestedClassifier", "class", [
    "class",
    "interface",
    "enumeration",
    "dataType",
    "primitiveType",
  ]),
];
