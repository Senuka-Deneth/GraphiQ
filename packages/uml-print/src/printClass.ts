import { assertNever } from "@graphiq/uml-core";
import type {
  AggregationRelationship,
  AssociationRelationship,
  Attribute,
  ClassElement,
  ClassifierElement,
  CompositionRelationship,
  EnumerationElement,
  InterfaceElement,
  NavigableAssociationRelationship,
  Operation,
  UmlElement,
  UmlModel,
  UmlRelationship,
  Visibility,
} from "@graphiq/uml-model";

function visibilitySymbol(visibility: Visibility): string {
  switch (visibility) {
    case "public":
      return "+";
    case "private":
      return "-";
    case "protected":
      return "#";
    case "package":
      return "~";
    default:
      return assertNever(visibility);
  }
}

function printAttribute(attribute: Attribute): string {
  const parts = [
    `${visibilitySymbol(attribute.visibility)}${attribute.name}: ${attribute.typeName}`,
  ];
  if (attribute.multiplicity !== undefined) {
    parts.push(`[${attribute.multiplicity}]`);
  }
  if (attribute.defaultValue !== undefined) {
    parts.push(`= ${attribute.defaultValue}`);
  }
  return parts.join(" ");
}

function printOperation(operation: Operation): string {
  const params = operation.parameters
    .map((parameter) => `${parameter.name}: ${parameter.typeName}`)
    .join(", ");
  const signature = `${visibilitySymbol(operation.visibility)}${operation.name}(${params})`;
  if (operation.returnType !== undefined) {
    return `${signature}: ${operation.returnType}`;
  }
  return signature;
}

function printClassBody(attributes: readonly Attribute[], operations: readonly Operation[]): string {
  const lines = [
    ...attributes.map((attribute) => `  ${printAttribute(attribute)}`),
    ...operations.map((operation) => `  ${printOperation(operation)}`),
  ];
  if (lines.length === 0) {
    return "";
  }
  return ` {\n${lines.join("\n")}\n}`;
}

function printClassElement(element: ClassElement): string {
  const keyword = element.isAbstract ? "abstract class" : "class";
  const body = printClassBody(element.attributes, element.operations);
  return `${keyword} ${element.name}${body}`;
}

function printInterfaceElement(element: InterfaceElement): string {
  const body = printClassBody(element.attributes, element.operations);
  return `interface ${element.name}${body}`;
}

function printEnumerationElement(element: EnumerationElement): string {
  if (element.literals.length === 0) {
    return `enum ${element.name} {}`;
  }
  const literals = element.literals.map((literal) => `  ${literal}`).join("\n");
  return `enum ${element.name} {\n${literals}\n}`;
}

function printClassifierLike(element: ClassifierElement): string {
  switch (element.elementType) {
    case "class":
      return printClassElement(element);
    case "interface":
      return printInterfaceElement(element);
    case "dataType":
    case "primitiveType":
    case "associationClass":
      return printClassElement({
        ...element,
        elementType: "class",
        isAbstract: element.elementType === "associationClass" ? element.isAbstract : false,
      });
    default:
      return assertNever(element);
  }
}

type PrintableElement = ClassifierElement | EnumerationElement;

function shouldPrintElement(element: UmlElement): element is PrintableElement {
  switch (element.elementType) {
    case "class":
    case "interface":
    case "enumeration":
    case "dataType":
    case "primitiveType":
    case "associationClass":
      return true;
    case "note":
    case "constraint":
      return false;
    default:
      return false;
  }
}

function printPrintableElement(element: PrintableElement): string {
  if (element.elementType === "enumeration") {
    return printEnumerationElement(element);
  }
  return printClassifierLike(element);
}

function formatMultiplicity(value: string | undefined): string | undefined {
  if (value === undefined || value === "1") {
    return undefined;
  }
  if (/^\*$/.test(value) || /^\d+$/.test(value) || /^\d+\.\.(\d+|\*)$/.test(value)) {
    return value;
  }
  return `"${value}"`;
}

type ClassAssociationRelationship =
  | AssociationRelationship
  | NavigableAssociationRelationship
  | AggregationRelationship
  | CompositionRelationship;

type ClassBinaryRelationship = {
  id: string;
  sourceId: string;
  targetId: string;
  name?: string;
  relationshipType:
    | "generalization"
    | "realization"
    | "interfaceRealization"
    | "dependency"
    | "usage";
};

type ClassPrintableRelationship = ClassAssociationRelationship | ClassBinaryRelationship;

type ClassPrintableRelationshipType = ClassPrintableRelationship["relationshipType"];

function relationshipArrow(type: ClassPrintableRelationshipType): string {
  switch (type) {
    case "association":
      return "--";
    case "navigableAssociation":
      return "-->";
    case "aggregation":
      return "o--";
    case "composition":
      return "*--";
    case "generalization":
      return "--|>";
    case "realization":
    case "interfaceRealization":
      return "..|>";
    case "dependency":
    case "usage":
      return "..>";
    default:
      return assertNever(type);
  }
}

function printAssociationRelationship(
  relationship: ClassAssociationRelationship,
  sourceName: string,
  targetName: string,
): string {
  const arrow = relationshipArrow(relationship.relationshipType);
  const sourceMultiplicity = formatMultiplicity(relationship.sourceMultiplicity);
  const targetMultiplicity = formatMultiplicity(relationship.targetMultiplicity);
  const sourcePart =
    sourceMultiplicity !== undefined ? `${sourceName} "${sourceMultiplicity}"` : sourceName;
  const targetPart =
    targetMultiplicity !== undefined ? `"${targetMultiplicity}" ${targetName}` : targetName;
  const label = relationship.name !== undefined ? ` : ${relationship.name}` : "";
  return `${sourcePart} ${arrow} ${targetPart}${label}`;
}

function printBinaryRelationship(
  relationship: ClassBinaryRelationship,
  sourceName: string,
  targetName: string,
): string {
  const arrow = relationshipArrow(relationship.relationshipType);
  const label = relationship.name !== undefined ? ` : ${relationship.name}` : "";
  return `${sourceName} ${arrow} ${targetName}${label}`;
}

function printRelationship(
  relationship: ClassPrintableRelationship,
  nameById: ReadonlyMap<string, string>,
): string {
  const sourceName = nameById.get(relationship.sourceId);
  const targetName = nameById.get(relationship.targetId);
  if (sourceName === undefined || targetName === undefined) {
    throw new Error("Relationship endpoints must reference printable elements");
  }

  switch (relationship.relationshipType) {
    case "association":
    case "navigableAssociation":
    case "aggregation":
    case "composition":
      return printAssociationRelationship(relationship, sourceName, targetName);
    case "generalization":
    case "realization":
    case "interfaceRealization":
    case "dependency":
    case "usage":
      return printBinaryRelationship(relationship, sourceName, targetName);
    default:
      return assertNever(relationship);
  }
}

function isClassPrintableRelationship(
  relationship: UmlRelationship,
): relationship is ClassPrintableRelationship {
  switch (relationship.relationshipType) {
    case "association":
    case "navigableAssociation":
    case "aggregation":
    case "composition":
    case "generalization":
    case "realization":
    case "interfaceRealization":
    case "dependency":
    case "usage":
      return true;
    default:
      return false;
  }
}

export function printClass(model: UmlModel, options?: { name?: string }): string {
  const lines: string[] = ["diagram class"];
  if (options?.name !== undefined) {
    lines[0] = `diagram class ${options.name}`;
  }

  const printableElements = model.elements.filter(shouldPrintElement);
  for (const element of printableElements) {
    lines.push("");
    lines.push(printPrintableElement(element));
  }

  const nameById = new Map<string, string>();
  for (const element of model.elements) {
    nameById.set(element.id, element.name);
  }

  const printableRelationships = model.relationships.filter(isClassPrintableRelationship);

  if (printableRelationships.length > 0) {
    lines.push("");
    for (const relationship of printableRelationships) {
      lines.push(printRelationship(relationship, nameById));
    }
  }

  return `${lines.join("\n")}\n`;
}
