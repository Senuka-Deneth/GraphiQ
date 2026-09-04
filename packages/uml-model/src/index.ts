export { ELEMENT_TYPES, isElementType } from "./elementType.js";
export type { ElementType } from "./elementType.js";

export { RELATIONSHIP_TYPES, isRelationshipType } from "./relationshipType.js";
export type { RelationshipType } from "./relationshipType.js";

export type {
  Attribute,
  CombinedFragmentOperator,
  MessageSort,
  Operation,
  OperationParameter,
  PseudostateKind,
  Slot,
  Visibility,
} from "./members.js";

export type {
  AssociationClassElement,
  ClassElement,
  ClassifierElement,
  CombinedFragmentElement,
  DataTypeElement,
  EnumerationElement,
  InstanceSpecificationElement,
  InterfaceElement,
  NamedElement,
  NewUmlElement,
  PrimitiveTypeElement,
  PseudostateElement,
  StateElement,
  StereotypeElement,
  UmlElement,
} from "./element.js";
export { isClassifierElement } from "./element.js";

export type {
  AggregationRelationship,
  AssociationRelationship,
  BinaryRelationship,
  CompositionRelationship,
  MessageRelationship,
  NavigableAssociationRelationship,
  NewUmlRelationship,
  TransitionRelationship,
  UmlRelationship,
} from "./relationship.js";
export { isAssociationFamilyRelationship } from "./relationship.js";

export type { UmlModel } from "./model.js";
export { emptyModel } from "./model.js";

export {
  allowedElements,
  allowedRelationships,
  isElementAllowedOn,
  isRelationshipAllowedOn,
} from "./allowed.js";

export type { ModelCommandError } from "./commands.js";
export {
  addElement,
  addRelationship,
  removeElement,
  removeRelationship,
  renameElement,
  setClassAttribute,
  setClassOperation,
} from "./commands.js";
