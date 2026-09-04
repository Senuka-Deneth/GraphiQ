import { createId } from "@graphiq/uml-core";
import type { ClassDiagramAst, AstClassifier } from "@graphiq/uml-dsl";
import {
  addElement,
  addRelationship,
  emptyModel,
  type Attribute,
  type Operation,
  type UmlModel,
} from "@graphiq/uml-model";

function astAttributesToModel(
  attributes: readonly {
    visibility: Attribute["visibility"];
    name: string;
    typeName: string;
    multiplicity?: string;
    defaultValue?: string;
  }[],
): Attribute[] {
  return attributes.map((attribute) => ({
    id: createId(),
    visibility: attribute.visibility,
    name: attribute.name,
    typeName: attribute.typeName,
    multiplicity: attribute.multiplicity,
    defaultValue: attribute.defaultValue,
  }));
}

function astOperationsToModel(
  operations: readonly {
    visibility: Operation["visibility"];
    name: string;
    parameters: readonly { name: string; typeName: string }[];
    returnType?: string;
  }[],
): Operation[] {
  return operations.map((operation) => ({
    id: createId(),
    visibility: operation.visibility,
    name: operation.name,
    parameters: operation.parameters.map((parameter) => ({
      name: parameter.name,
      typeName: parameter.typeName,
    })),
    returnType: operation.returnType,
  }));
}

function addClassifier(model: UmlModel, classifier: AstClassifier): UmlModel {
  switch (classifier.classifierKind) {
    case "class": {
      const result = addElement(model, {
        elementType: "class",
        name: classifier.name,
        isAbstract: classifier.isAbstract,
        attributes: astAttributesToModel(classifier.attributes),
        operations: astOperationsToModel(classifier.operations),
      });
      if (!result.ok) {
        throw new Error(result.error.message);
      }
      return result.value;
    }
    case "interface": {
      const result = addElement(model, {
        elementType: "interface",
        name: classifier.name,
        attributes: astAttributesToModel(classifier.attributes),
        operations: astOperationsToModel(classifier.operations),
      });
      if (!result.ok) {
        throw new Error(result.error.message);
      }
      return result.value;
    }
    case "enumeration": {
      const result = addElement(model, {
        elementType: "enumeration",
        name: classifier.name,
        literals: [...classifier.literals],
      });
      if (!result.ok) {
        throw new Error(result.error.message);
      }
      return result.value;
    }
    default:
      return classifier satisfies never;
  }
}

function ensureElementByName(model: UmlModel, name: string): UmlModel {
  if (model.elements.some((element) => element.name === name)) {
    return model;
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

export function classAstToModel(ast: ClassDiagramAst): UmlModel {
  let model = emptyModel("class");

  for (const classifier of ast.classifiers) {
    model = addClassifier(model, classifier);
  }

  for (const relationship of ast.relationships) {
    model = ensureElementByName(model, relationship.sourceName);
    model = ensureElementByName(model, relationship.targetName);

    const sourceId = elementIdByName(model, relationship.sourceName);
    const targetId = elementIdByName(model, relationship.targetName);

    switch (relationship.relationshipType) {
      case "association":
      case "navigableAssociation":
      case "aggregation":
      case "composition": {
        const result = addRelationship(model, {
          relationshipType: relationship.relationshipType,
          sourceId,
          targetId,
          name: relationship.name,
          sourceMultiplicity: relationship.sourceMultiplicity,
          targetMultiplicity: relationship.targetMultiplicity,
        });
        if (!result.ok) {
          throw new Error(result.error.message);
        }
        model = result.value;
        break;
      }
      case "generalization":
      case "realization":
      case "dependency": {
        const result = addRelationship(model, {
          relationshipType: relationship.relationshipType,
          sourceId,
          targetId,
          name: relationship.name,
        });
        if (!result.ok) {
          throw new Error(result.error.message);
        }
        model = result.value;
        break;
      }
      default:
        throw new Error(`Unsupported relationship type in class AST: ${String(relationship.relationshipType)}`);
    }
  }

  return model;
}
