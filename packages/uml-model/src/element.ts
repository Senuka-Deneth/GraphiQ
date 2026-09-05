import type { ElementType } from "./elementType.js";
import type {
  Attribute,
  CombinedFragmentOperator,
  Operation,
  PseudostateKind,
  Slot,
} from "./members.js";

type NamedElementBase = {
  id: string;
  name: string;
  parentId?: string;
};

type ClassifierElementBase = NamedElementBase & {
  attributes: Attribute[];
  operations: Operation[];
};

export type ClassElement = ClassifierElementBase & {
  elementType: "class";
  isAbstract: boolean;
};

export type InterfaceElement = ClassifierElementBase & {
  elementType: "interface";
};

export type DataTypeElement = ClassifierElementBase & {
  elementType: "dataType";
};

export type PrimitiveTypeElement = ClassifierElementBase & {
  elementType: "primitiveType";
};

export type AssociationClassElement = ClassifierElementBase & {
  elementType: "associationClass";
  isAbstract: boolean;
};

export type EnumerationElement = NamedElementBase & {
  elementType: "enumeration";
  literals: string[];
};

export type InstanceSpecificationElement = NamedElementBase & {
  elementType: "instanceSpecification";
  classifierName: string;
  slots: Slot[];
};

export type PseudostateElement = NamedElementBase & {
  elementType: "pseudostate";
  kind: PseudostateKind;
};

export type CombinedFragmentOperand = {
  guard?: string;
  messageIds: string[];
};

export type CombinedFragmentElement = NamedElementBase & {
  elementType: "combinedFragment";
  operator: CombinedFragmentOperator;
  operands: CombinedFragmentOperand[];
};

export type LifelineElement = NamedElementBase & {
  elementType: "lifeline";
  classifierName?: string;
};

export type ExecutionSpecificationElement = NamedElementBase & {
  elementType: "executionSpecification";
  startMessageId?: string;
  finishMessageId?: string;
};

export type StateElement = NamedElementBase & {
  elementType: "state";
  entry?: string;
  do?: string;
  exit?: string;
};

export type StereotypeElement = NamedElementBase & {
  elementType: "stereotype";
  attributes: Attribute[];
};

export type PartElement = NamedElementBase & {
  elementType: "part";
  typeName: string;
  multiplicity?: string;
};

export type PortElement = NamedElementBase & {
  elementType: "port";
  typeName?: string;
};

export type TimingStateElement = NamedElementBase & {
  elementType: "timingState";
  at: number;
  until?: number;
};

export type DurationConstraintElement = NamedElementBase & {
  elementType: "durationConstraint";
  min: number;
  max: number;
};

export type TimeConstraintElement = NamedElementBase & {
  elementType: "timeConstraint";
  time: number;
};

export type NamedElement = NamedElementBase & {
  elementType: Exclude<
    ElementType,
    | "class"
    | "interface"
    | "dataType"
    | "primitiveType"
    | "associationClass"
    | "enumeration"
    | "instanceSpecification"
    | "pseudostate"
    | "combinedFragment"
    | "lifeline"
    | "executionSpecification"
    | "state"
    | "stereotype"
    | "part"
    | "port"
    | "timingState"
    | "durationConstraint"
    | "timeConstraint"
  >;
};

export type UmlElement =
  | ClassElement
  | InterfaceElement
  | DataTypeElement
  | PrimitiveTypeElement
  | AssociationClassElement
  | EnumerationElement
  | InstanceSpecificationElement
  | PseudostateElement
  | CombinedFragmentElement
  | LifelineElement
  | ExecutionSpecificationElement
  | StateElement
  | StereotypeElement
  | PartElement
  | PortElement
  | TimingStateElement
  | DurationConstraintElement
  | TimeConstraintElement
  | NamedElement;

type WithOptional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type NewUmlElement =
  | WithOptional<Omit<ClassElement, "id">, "attributes" | "operations" | "isAbstract">
  | WithOptional<Omit<InterfaceElement, "id">, "attributes" | "operations">
  | WithOptional<Omit<DataTypeElement, "id">, "attributes" | "operations">
  | WithOptional<Omit<PrimitiveTypeElement, "id">, "attributes" | "operations">
  | WithOptional<
      Omit<AssociationClassElement, "id">,
      "attributes" | "operations" | "isAbstract"
    >
  | WithOptional<Omit<EnumerationElement, "id">, "literals">
  | WithOptional<Omit<InstanceSpecificationElement, "id">, "slots">
  | Omit<PseudostateElement, "id">
  | WithOptional<Omit<CombinedFragmentElement, "id">, "operands">
  | WithOptional<Omit<LifelineElement, "id">, "classifierName">
  | WithOptional<
      Omit<ExecutionSpecificationElement, "id">,
      "startMessageId" | "finishMessageId"
    >
  | WithOptional<Omit<StateElement, "id">, "entry" | "do" | "exit">
  | WithOptional<Omit<StereotypeElement, "id">, "attributes">
  | WithOptional<Omit<PartElement, "id">, "multiplicity">
  | Omit<PortElement, "id">
  | WithOptional<Omit<TimingStateElement, "id">, "until">
  | Omit<DurationConstraintElement, "id">
  | Omit<TimeConstraintElement, "id">
  | Omit<NamedElement, "id">;

export type ClassifierElement =
  | ClassElement
  | InterfaceElement
  | DataTypeElement
  | PrimitiveTypeElement
  | AssociationClassElement;

export function isClassifierElement(
  element: UmlElement,
): element is ClassifierElement {
  return (
    element.elementType === "class" ||
    element.elementType === "interface" ||
    element.elementType === "dataType" ||
    element.elementType === "primitiveType" ||
    element.elementType === "associationClass"
  );
}
