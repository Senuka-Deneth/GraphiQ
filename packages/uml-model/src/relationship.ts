import type { RelationshipType } from "./relationshipType.js";
import type { MessageSort } from "./members.js";

type RelationshipBase = {
  id: string;
  sourceId: string;
  targetId: string;
  name?: string;
};

export type AssociationRelationship = RelationshipBase & {
  relationshipType: "association";
  sourceMultiplicity: string;
  targetMultiplicity: string;
};

export type NavigableAssociationRelationship = RelationshipBase & {
  relationshipType: "navigableAssociation";
  sourceMultiplicity: string;
  targetMultiplicity: string;
};

export type AggregationRelationship = RelationshipBase & {
  relationshipType: "aggregation";
  sourceMultiplicity: string;
  targetMultiplicity: string;
};

export type CompositionRelationship = RelationshipBase & {
  relationshipType: "composition";
  sourceMultiplicity: string;
  targetMultiplicity: string;
};

export type MessageRelationship = RelationshipBase & {
  relationshipType: "message";
  messageSort: MessageSort;
  sequenceNumber?: string;
};

export type TransitionRelationship = RelationshipBase & {
  relationshipType: "transition";
  trigger?: string;
  guard?: string;
  effect?: string;
};

export type ControlFlowRelationship = RelationshipBase & {
  relationshipType: "controlFlow";
  guard?: string;
};

export type ObjectFlowRelationship = RelationshipBase & {
  relationshipType: "objectFlow";
  guard?: string;
};

export type BinaryRelationship = RelationshipBase & {
  relationshipType: Exclude<
    RelationshipType,
    | "association"
    | "navigableAssociation"
    | "aggregation"
    | "composition"
    | "message"
    | "transition"
    | "controlFlow"
    | "objectFlow"
  >;
};

export type UmlRelationship =
  | AssociationRelationship
  | NavigableAssociationRelationship
  | AggregationRelationship
  | CompositionRelationship
  | MessageRelationship
  | TransitionRelationship
  | ControlFlowRelationship
  | ObjectFlowRelationship
  | BinaryRelationship;

type WithOptional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type NewUmlRelationship =
  | WithOptional<
      Omit<AssociationRelationship, "id">,
      "sourceMultiplicity" | "targetMultiplicity"
    >
  | WithOptional<
      Omit<NavigableAssociationRelationship, "id">,
      "sourceMultiplicity" | "targetMultiplicity"
    >
  | WithOptional<
      Omit<AggregationRelationship, "id">,
      "sourceMultiplicity" | "targetMultiplicity"
    >
  | WithOptional<
      Omit<CompositionRelationship, "id">,
      "sourceMultiplicity" | "targetMultiplicity"
    >
  | WithOptional<Omit<MessageRelationship, "id">, "sequenceNumber">
  | WithOptional<Omit<TransitionRelationship, "id">, "trigger" | "guard" | "effect">
  | WithOptional<Omit<ControlFlowRelationship, "id">, "guard">
  | WithOptional<Omit<ObjectFlowRelationship, "id">, "guard">
  | Omit<BinaryRelationship, "id">;

export function isAssociationFamilyRelationship(
  relationship: UmlRelationship,
): relationship is
  | AssociationRelationship
  | NavigableAssociationRelationship
  | AggregationRelationship
  | CompositionRelationship {
  return (
    relationship.relationshipType === "association" ||
    relationship.relationshipType === "navigableAssociation" ||
    relationship.relationshipType === "aggregation" ||
    relationship.relationshipType === "composition"
  );
}

export function isActivityFlowRelationship(
  relationship: UmlRelationship,
): relationship is ControlFlowRelationship | ObjectFlowRelationship {
  return (
    relationship.relationshipType === "controlFlow" ||
    relationship.relationshipType === "objectFlow"
  );
}

export function isTransitionRelationship(
  relationship: UmlRelationship,
): relationship is TransitionRelationship {
  return relationship.relationshipType === "transition";
}
