import { createId } from "@graphiq/uml-core";
import type { ClassDiagramAst, AstClassifier } from "@graphiq/uml-dsl";
import {
  addElement,
  emptyModel,
  type Attribute,
  type Operation,
  type UmlElement,
  type UmlModel,
  type UmlRelationship,
} from "@graphiq/uml-model";

type AstAttribute = {
  visibility: Attribute["visibility"];
  name: string;
  typeName: string;
  multiplicity?: string;
  defaultValue?: string;
};

type AstOperation = {
  visibility: Operation["visibility"];
  name: string;
  parameters: readonly { name: string; typeName: string }[];
  returnType?: string;
};

function findPreviousClassifier(
  previous: UmlModel | undefined,
  classifier: AstClassifier,
): UmlElement | undefined {
  if (!previous) {
    return undefined;
  }

  return (
    previous.elements.find((element) => {
      switch (classifier.classifierKind) {
        case "class":
          return (
            element.elementType === "class" &&
            element.name === classifier.name &&
            element.isAbstract === classifier.isAbstract
          );
        case "interface":
          return element.elementType === "interface" && element.name === classifier.name;
        case "enumeration":
          return element.elementType === "enumeration" && element.name === classifier.name;
        default:
          return classifier satisfies never;
      }
    }) ??
    previous.elements.find((element) => {
      if (classifier.classifierKind === "class" && element.elementType === "class") {
        return element.name === classifier.name;
      }
      if (classifier.classifierKind === "interface" && element.elementType === "interface") {
        return element.name === classifier.name;
      }
      if (classifier.classifierKind === "enumeration" && element.elementType === "enumeration") {
        return element.name === classifier.name;
      }
      return false;
    })
  );
}

function mergeAttributes(
  astAttributes: readonly AstAttribute[],
  previousAttributes: readonly Attribute[] = [],
): Attribute[] {
  const previousByName = new Map(previousAttributes.map((attribute) => [attribute.name, attribute]));

  return astAttributes.map((attribute) => {
    const previous = previousByName.get(attribute.name);
    return {
      id: previous?.id ?? createId(),
      visibility: attribute.visibility,
      name: attribute.name,
      typeName: attribute.typeName,
      multiplicity: attribute.multiplicity,
      defaultValue: attribute.defaultValue,
    };
  });
}

function mergeOperations(
  astOperations: readonly AstOperation[],
  previousOperations: readonly Operation[] = [],
): Operation[] {
  const previousByName = new Map(previousOperations.map((operation) => [operation.name, operation]));

  return astOperations.map((operation) => {
    const previous = previousByName.get(operation.name);
    return {
      id: previous?.id ?? createId(),
      visibility: operation.visibility,
      name: operation.name,
      parameters: operation.parameters.map((parameter) => ({
        name: parameter.name,
        typeName: parameter.typeName,
      })),
      returnType: operation.returnType,
    };
  });
}

function buildClassifierElement(
  classifier: AstClassifier,
  previous?: UmlElement,
): NewUmlElementFromClassifier {
  switch (classifier.classifierKind) {
    case "class": {
      const previousClass =
        previous?.elementType === "class" ? previous : undefined;
      return {
        elementType: "class",
        id: previousClass?.id ?? createId(),
        name: classifier.name,
        isAbstract: classifier.isAbstract,
        attributes: mergeAttributes(classifier.attributes, previousClass?.attributes),
        operations: mergeOperations(classifier.operations, previousClass?.operations),
      };
    }
    case "interface": {
      const previousInterface =
        previous?.elementType === "interface" ? previous : undefined;
      return {
        elementType: "interface",
        id: previousInterface?.id ?? createId(),
        name: classifier.name,
        attributes: mergeAttributes(classifier.attributes, previousInterface?.attributes),
        operations: mergeOperations(classifier.operations, previousInterface?.operations),
      };
    }
    case "enumeration": {
      const previousEnum =
        previous?.elementType === "enumeration" ? previous : undefined;
      return {
        elementType: "enumeration",
        id: previousEnum?.id ?? createId(),
        name: classifier.name,
        literals: [...classifier.literals],
      };
    }
    default:
      return classifier satisfies never;
  }
}

type NewUmlElementFromClassifier =
  | {
      elementType: "class";
      id: string;
      name: string;
      isAbstract: boolean;
      attributes: Attribute[];
      operations: Operation[];
    }
  | {
      elementType: "interface";
      id: string;
      name: string;
      attributes: Attribute[];
      operations: Operation[];
    }
  | {
      elementType: "enumeration";
      id: string;
      name: string;
      literals: string[];
    };

function insertClassifierElement(model: UmlModel, spec: NewUmlElementFromClassifier): UmlModel {
  switch (spec.elementType) {
    case "class":
      return {
        ...model,
        elements: [
          ...model.elements,
          {
            id: spec.id,
            elementType: "class",
            name: spec.name,
            isAbstract: spec.isAbstract,
            attributes: spec.attributes,
            operations: spec.operations,
          },
        ],
      };
    case "interface":
      return {
        ...model,
        elements: [
          ...model.elements,
          {
            id: spec.id,
            elementType: "interface",
            name: spec.name,
            attributes: spec.attributes,
            operations: spec.operations,
          },
        ],
      };
    case "enumeration":
      return {
        ...model,
        elements: [
          ...model.elements,
          {
            id: spec.id,
            elementType: "enumeration",
            name: spec.name,
            literals: spec.literals,
          },
        ],
      };
    default:
      return spec satisfies never;
  }
}

function findPreviousRelationship(
  previous: UmlModel | undefined,
  sourceId: string,
  targetId: string,
  relationshipType: UmlRelationship["relationshipType"],
  name?: string,
): UmlRelationship | undefined {
  if (!previous) {
    return undefined;
  }

  return previous.relationships.find(
    (relationship) =>
      relationship.sourceId === sourceId &&
      relationship.targetId === targetId &&
      relationship.relationshipType === relationshipType &&
      relationship.name === name,
  );
}

function ensureElementByName(
  model: UmlModel,
  name: string,
  previous?: UmlModel,
): UmlModel {
  if (model.elements.some((element) => element.name === name)) {
    return model;
  }

  const previousElement = previous?.elements.find((element) => element.name === name);
  if (previousElement !== undefined) {
    return {
      ...model,
      elements: [...model.elements, previousElement],
    };
  }

  const result = addElement(model, { elementType: "class", name });
  if (!result.ok) {
    throw new Error(result.error.message);
  }
  return result.value;
}

function elementIdByName(model: UmlModel, name: string): string {
  const element = model.elements.find((item) => item.name === name);
  if (element === undefined) {
    throw new Error(`Element "${name}" was not found`);
  }
  return element.id;
}

function preservedNonDslElements(previous: UmlModel | undefined): UmlElement[] {
  if (!previous) {
    return [];
  }

  return previous.elements.filter(
    (element) => element.elementType === "note" || element.elementType === "constraint",
  );
}

function addAssociationFamilyRelationship(
  model: UmlModel,
  relationship: ClassDiagramAst["relationships"][number],
  sourceId: string,
  targetId: string,
  previousRelationship?: UmlRelationship,
): UmlModel {
  const id = previousRelationship?.id ?? createId();
  const sourceMultiplicity = relationship.sourceMultiplicity ?? "1";
  const targetMultiplicity = relationship.targetMultiplicity ?? "1";
  const name = relationship.name;

  let nextRelationship: UmlRelationship;
  switch (relationship.relationshipType) {
    case "association":
      nextRelationship = {
        id,
        relationshipType: "association",
        sourceId,
        targetId,
        name,
        sourceMultiplicity,
        targetMultiplicity,
      };
      break;
    case "navigableAssociation":
      nextRelationship = {
        id,
        relationshipType: "navigableAssociation",
        sourceId,
        targetId,
        name,
        sourceMultiplicity,
        targetMultiplicity,
      };
      break;
    case "aggregation":
      nextRelationship = {
        id,
        relationshipType: "aggregation",
        sourceId,
        targetId,
        name,
        sourceMultiplicity,
        targetMultiplicity,
      };
      break;
    case "composition":
      nextRelationship = {
        id,
        relationshipType: "composition",
        sourceId,
        targetId,
        name,
        sourceMultiplicity,
        targetMultiplicity,
      };
      break;
    default:
      throw new Error(`Expected association-family relationship, got ${String(relationship.relationshipType)}`);
  }

  return {
    ...model,
    relationships: [...model.relationships, nextRelationship],
  };
}

function addBinaryRelationship(
  model: UmlModel,
  relationship: ClassDiagramAst["relationships"][number],
  sourceId: string,
  targetId: string,
  previousRelationship?: UmlRelationship,
): UmlModel {
  const id = previousRelationship?.id ?? createId();
  const name = relationship.name;

  let nextRelationship: UmlRelationship;
  switch (relationship.relationshipType) {
    case "generalization":
      nextRelationship = {
        id,
        relationshipType: "generalization",
        sourceId,
        targetId,
        name,
      };
      break;
    case "realization":
      nextRelationship = {
        id,
        relationshipType: "realization",
        sourceId,
        targetId,
        name,
      };
      break;
    case "dependency":
      nextRelationship = {
        id,
        relationshipType: "dependency",
        sourceId,
        targetId,
        name,
      };
      break;
    default:
      throw new Error(`Expected binary relationship, got ${String(relationship.relationshipType)}`);
  }

  return {
    ...model,
    relationships: [...model.relationships, nextRelationship],
  };
}

export function classAstToModel(ast: ClassDiagramAst, previous?: UmlModel): UmlModel {
  const base = previous ?? emptyModel("class");
  let model: UmlModel = {
    id: base.id,
    kind: "class",
    elements: preservedNonDslElements(previous),
    relationships: [],
  };

  for (const classifier of ast.classifiers) {
    const previousClassifier = findPreviousClassifier(previous, classifier);
    const spec = buildClassifierElement(classifier, previousClassifier);
    model = insertClassifierElement(model, spec);
  }

  for (const relationship of ast.relationships) {
    model = ensureElementByName(model, relationship.sourceName, previous);
    model = ensureElementByName(model, relationship.targetName, previous);

    const sourceId = elementIdByName(model, relationship.sourceName);
    const targetId = elementIdByName(model, relationship.targetName);
    const previousRelationship = findPreviousRelationship(
      previous,
      sourceId,
      targetId,
      relationship.relationshipType,
      relationship.name,
    );

    switch (relationship.relationshipType) {
      case "association":
      case "navigableAssociation":
      case "aggregation":
      case "composition":
        model = addAssociationFamilyRelationship(
          model,
          relationship,
          sourceId,
          targetId,
          previousRelationship,
        );
        break;
      case "generalization":
      case "realization":
      case "dependency":
        model = addBinaryRelationship(
          model,
          relationship,
          sourceId,
          targetId,
          previousRelationship,
        );
        break;
      default:
        throw new Error(
          `Unsupported relationship type in class AST: ${String(relationship.relationshipType)}`,
        );
    }
  }

  return model;
}
