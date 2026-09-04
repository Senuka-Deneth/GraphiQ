import { assertNever } from "@graphiq/uml-core";
import type { DiagramKind } from "@graphiq/uml-core";
import type { ElementType } from "./elementType.js";
import type { RelationshipType } from "./relationshipType.js";

function setOf<T extends string>(...values: T[]): ReadonlySet<T> {
  return new Set(values);
}

const CLASS_ELEMENTS = setOf<ElementType>(
  "class",
  "interface",
  "dataType",
  "enumeration",
  "primitiveType",
  "associationClass",
  "note",
  "constraint",
);

const CLASS_RELATIONSHIPS = setOf<RelationshipType>(
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
);

const OBJECT_ELEMENTS = setOf<ElementType>("instanceSpecification", "note");

const OBJECT_RELATIONSHIPS = setOf<RelationshipType>("link", "dependency");

const PACKAGE_ELEMENTS = setOf<ElementType>(
  "package",
  "class",
  "interface",
  "dataType",
  "enumeration",
  "primitiveType",
  "note",
);

const PACKAGE_RELATIONSHIPS = setOf<RelationshipType>(
  "packageImport",
  "packageMerge",
  "containment",
  "dependency",
);

const COMPOSITE_STRUCTURE_ELEMENTS = setOf<ElementType>(
  "class",
  "component",
  "part",
  "port",
  "collaboration",
  "collaborationUse",
  "note",
);

const COMPOSITE_STRUCTURE_RELATIONSHIPS = setOf<RelationshipType>(
  "connector",
  "assemblyConnector",
  "dependency",
);

const COMPONENT_ELEMENTS = setOf<ElementType>(
  "component",
  "port",
  "interface",
  "artifact",
  "note",
);

const COMPONENT_RELATIONSHIPS = setOf<RelationshipType>(
  "componentRealization",
  "interfaceRealization",
  "usage",
  "assemblyConnector",
  "delegationConnector",
  "dependency",
);

const DEPLOYMENT_ELEMENTS = setOf<ElementType>(
  "node",
  "device",
  "executionEnvironment",
  "artifact",
  "deploymentSpecification",
  "note",
);

const DEPLOYMENT_RELATIONSHIPS = setOf<RelationshipType>(
  "deployment",
  "communicationPath",
  "manifestation",
  "generalization",
);

const PROFILE_ELEMENTS = setOf<ElementType>(
  "profile",
  "stereotype",
  "metaclass",
  "enumeration",
  "primitiveType",
  "note",
);

const PROFILE_RELATIONSHIPS = setOf<RelationshipType>(
  "extension",
  "generalization",
);

const USE_CASE_ELEMENTS = setOf<ElementType>(
  "actor",
  "useCase",
  "subject",
  "package",
  "note",
);

const USE_CASE_RELATIONSHIPS = setOf<RelationshipType>(
  "association",
  "include",
  "extend",
  "generalization",
);

const ACTIVITY_ELEMENTS = setOf<ElementType>(
  "activity",
  "action",
  "objectNode",
  "initialNode",
  "activityFinalNode",
  "flowFinalNode",
  "decisionNode",
  "mergeNode",
  "forkNode",
  "joinNode",
  "activityPartition",
  "interruptibleActivityRegion",
  "note",
);

const ACTIVITY_RELATIONSHIPS = setOf<RelationshipType>(
  "controlFlow",
  "objectFlow",
);

const STATE_MACHINE_ELEMENTS = setOf<ElementType>(
  "stateMachine",
  "region",
  "state",
  "pseudostate",
  "finalState",
  "note",
);

const STATE_MACHINE_RELATIONSHIPS = setOf<RelationshipType>("transition");

const SEQUENCE_ELEMENTS = setOf<ElementType>(
  "interaction",
  "lifeline",
  "executionSpecification",
  "combinedFragment",
  "interactionUse",
  "gate",
  "destructionOccurrence",
  "stateInvariant",
  "note",
);

const SEQUENCE_RELATIONSHIPS = setOf<RelationshipType>("message");

const COMMUNICATION_ELEMENTS = setOf<ElementType>(
  "instanceSpecification",
  "lifeline",
  "note",
);

const COMMUNICATION_RELATIONSHIPS = setOf<RelationshipType>("link", "message");

const TIMING_ELEMENTS = setOf<ElementType>(
  "interaction",
  "lifeline",
  "timingState",
  "durationConstraint",
  "timeConstraint",
  "note",
);

const TIMING_RELATIONSHIPS = setOf<RelationshipType>("message");

const INTERACTION_OVERVIEW_ELEMENTS = setOf<ElementType>(
  "initialNode",
  "activityFinalNode",
  "decisionNode",
  "mergeNode",
  "forkNode",
  "joinNode",
  "interactionUse",
  "note",
);

const INTERACTION_OVERVIEW_RELATIONSHIPS = setOf<RelationshipType>("controlFlow");

export function allowedElements(kind: DiagramKind): ReadonlySet<ElementType> {
  switch (kind) {
    case "class":
      return CLASS_ELEMENTS;
    case "object":
      return OBJECT_ELEMENTS;
    case "package":
      return PACKAGE_ELEMENTS;
    case "compositeStructure":
      return COMPOSITE_STRUCTURE_ELEMENTS;
    case "component":
      return COMPONENT_ELEMENTS;
    case "deployment":
      return DEPLOYMENT_ELEMENTS;
    case "profile":
      return PROFILE_ELEMENTS;
    case "useCase":
      return USE_CASE_ELEMENTS;
    case "activity":
      return ACTIVITY_ELEMENTS;
    case "stateMachine":
      return STATE_MACHINE_ELEMENTS;
    case "sequence":
      return SEQUENCE_ELEMENTS;
    case "communication":
      return COMMUNICATION_ELEMENTS;
    case "timing":
      return TIMING_ELEMENTS;
    case "interactionOverview":
      return INTERACTION_OVERVIEW_ELEMENTS;
    default:
      return assertNever(kind);
  }
}

export function allowedRelationships(
  kind: DiagramKind,
): ReadonlySet<RelationshipType> {
  switch (kind) {
    case "class":
      return CLASS_RELATIONSHIPS;
    case "object":
      return OBJECT_RELATIONSHIPS;
    case "package":
      return PACKAGE_RELATIONSHIPS;
    case "compositeStructure":
      return COMPOSITE_STRUCTURE_RELATIONSHIPS;
    case "component":
      return COMPONENT_RELATIONSHIPS;
    case "deployment":
      return DEPLOYMENT_RELATIONSHIPS;
    case "profile":
      return PROFILE_RELATIONSHIPS;
    case "useCase":
      return USE_CASE_RELATIONSHIPS;
    case "activity":
      return ACTIVITY_RELATIONSHIPS;
    case "stateMachine":
      return STATE_MACHINE_RELATIONSHIPS;
    case "sequence":
      return SEQUENCE_RELATIONSHIPS;
    case "communication":
      return COMMUNICATION_RELATIONSHIPS;
    case "timing":
      return TIMING_RELATIONSHIPS;
    case "interactionOverview":
      return INTERACTION_OVERVIEW_RELATIONSHIPS;
    default:
      return assertNever(kind);
  }
}

export function isElementAllowedOn(
  kind: DiagramKind,
  elementType: ElementType,
): boolean {
  return allowedElements(kind).has(elementType);
}

export function isRelationshipAllowedOn(
  kind: DiagramKind,
  relationshipType: RelationshipType,
): boolean {
  return allowedRelationships(kind).has(relationshipType);
}
