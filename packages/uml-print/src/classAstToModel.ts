import { createId } from "@graphiq/uml-core";
import type { ClassDiagramAst, AstClassifier } from "@graphiq/uml-dsl";
import {
  emptyModel,
  type Attribute,
  type Operation,
  type UmlElement,
  type UmlModel,
  type UmlRelationship,
} from "@graphiq/uml-model";
import { createBuildContext, type BuildContext, type IdentityTable } from "./identity.js";

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

function ensureElementByName(
  model: UmlModel,
  name: string,
  identity: IdentityTable,
  span?: ClassDiagramAst["relationships"][number]["sourceNameSpan"],
): UmlModel {
  const matches = model.elements.filter((element) => element.name === name);
  if (matches.length === 1) {
    return model;
  }
  if (matches.length > 1) {
    return model;
  }

  const claim = identity.allocateElement({
    elementType: "class",
    name,
    span,
  });
  return {
    ...model,
    elements: [
      ...model.elements,
      {
        id: claim.id,
        elementType: "class",
        name,
        isAbstract: false,
        attributes: [],
        operations: [],
      },
    ],
  };
}

function elementIdByName(
  model: UmlModel,
  name: string,
  identity: IdentityTable,
  span?: ClassDiagramAst["relationships"][number]["sourceNameSpan"],
): string | undefined {
  return identity.resolve(model, name, span);
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
  id: string,
): UmlModel {
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
  id: string,
): UmlModel {
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

export function classAstToModel(
  ast: ClassDiagramAst,
  previous?: UmlModel,
  context?: BuildContext,
): UmlModel {
  const identity = context?.identity ?? createBuildContext(previous).identity;
  const base = previous ?? emptyModel("class");
  let model: UmlModel = {
    id: base.id,
    kind: "class",
    elements: preservedNonDslElements(previous),
    relationships: [],
  };

  for (const classifier of ast.classifiers) {
    const elementType =
      classifier.classifierKind === "class"
        ? "class"
        : classifier.classifierKind === "interface"
          ? "interface"
          : "enumeration";
    const claim = identity.allocateElement({
      elementType,
      name: classifier.name,
      span: classifier.nameSpan,
    });
    const spec = {
      ...buildClassifierElement(classifier, claim.previous),
      id: claim.id,
    };
    model = insertClassifierElement(model, spec);
  }

  for (const relationship of ast.relationships) {
    model = ensureElementByName(model, relationship.sourceName, identity, relationship.sourceNameSpan);
    model = ensureElementByName(model, relationship.targetName, identity, relationship.targetNameSpan);

    const sourceId = elementIdByName(
      model,
      relationship.sourceName,
      identity,
      relationship.sourceNameSpan,
    );
    const targetId = elementIdByName(
      model,
      relationship.targetName,
      identity,
      relationship.targetNameSpan,
    );
    if (sourceId === undefined || targetId === undefined) {
      continue;
    }

    const claim = identity.allocateRelationship({
      sourceId,
      targetId,
      relationshipType: relationship.relationshipType,
      name: relationship.name,
      span: relationship.span,
    });

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
          claim.id,
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
          claim.id,
        );
        break;
      default:
        identity.unsupported(
          `Unsupported relationship type in class AST: ${String(relationship.relationshipType)}`,
          relationship.span,
        );
    }
  }

  return model;
}
