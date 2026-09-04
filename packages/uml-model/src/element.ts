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

export type CombinedFragmentElement = NamedElementBase & {
  elementType: "combinedFragment";
  operator: CombinedFragmentOperator;
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
    | "state"
    | "stereotype"
    | "part"
    | "port"
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
  | StateElement
  | StereotypeElement
  | PartElement
  | PortElement
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
  | Omit<CombinedFragmentElement, "id">
  | WithOptional<Omit<StateElement, "id">, "entry" | "do" | "exit">
  | WithOptional<Omit<StereotypeElement, "id">, "attributes">
  | WithOptional<Omit<PartElement, "id">, "multiplicity">
  | Omit<PortElement, "id">
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
