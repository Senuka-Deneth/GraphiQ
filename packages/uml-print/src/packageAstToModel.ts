import { createId } from "@graphiq/uml-core";
import type {
  AstClassifier,
  AstPackageBodyItem,
  AstPackageDeclaration,
  PackageDiagramAst,
} from "@graphiq/uml-dsl";
import {
  addElement,
  emptyModel,
  type UmlElement,
  type UmlModel,
  type UmlRelationship,
} from "@graphiq/uml-model";

function findPreviousElement(
  previous: UmlModel | undefined,
  name: string,
  elementType: UmlElement["elementType"],
): UmlElement | undefined {
  if (!previous) {
    return undefined;
  }

  return previous.elements.find(
    (element) => element.name === name && element.elementType === elementType,
  );
}

function findPreviousRelationship(
  previous: UmlModel | undefined,
  sourceId: string,
  targetId: string,
  relationshipType: UmlRelationship["relationshipType"],
): UmlRelationship | undefined {
  if (!previous) {
    return undefined;
  }

  return previous.relationships.find(
    (relationship) =>
      relationship.sourceId === sourceId &&
      relationship.targetId === targetId &&
      relationship.relationshipType === relationshipType,
  );
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

  return previous.elements.filter((element) => element.elementType === "note");
}

function classifierFromAst(classifier: AstClassifier, previous?: UmlElement): UmlElement {
  switch (classifier.classifierKind) {
    case "class":
      return {
        id: previous?.id ?? createId(),
        elementType: "class",
        name: classifier.name,
        isAbstract: classifier.isAbstract,
        attributes: [],
        operations: [],
      };
    case "interface":
      return {
        id: previous?.id ?? createId(),
        elementType: "interface",
        name: classifier.name,
        attributes: [],
        operations: [],
      };
    case "enumeration":
      return {
        id: previous?.id ?? createId(),
        elementType: "enumeration",
        name: classifier.name,
        literals: [...classifier.literals],
      };
    default:
      return classifier satisfies never;
  }
}

function addPackageElement(
  model: UmlModel,
  name: string,
  parentId: string | undefined,
  previous?: UmlModel,
): UmlModel {
  const previousPackage = findPreviousElement(previous, name, "package");
  const element = {
    id: previousPackage?.id ?? createId(),
    elementType: "package" as const,
    name,
    ...(parentId !== undefined ? { parentId } : {}),
  };

  return {
    ...model,
    elements: [...model.elements.filter((item) => item.id !== element.id), element],
  };
}

function addClassifierElement(
  model: UmlModel,
  classifier: AstClassifier,
  parentId: string | undefined,
  previous?: UmlModel,
): UmlModel {
  const previousClassifier = previous?.elements.find(
    (element) => element.name === classifier.name,
  );
  const element = classifierFromAst(classifier, previousClassifier);
  const withParent =
    parentId !== undefined ? { ...element, parentId } : element;

  return {
    ...model,
    elements: [...model.elements.filter((item) => item.id !== withParent.id), withParent],
  };
}

function addBodyItems(
  model: UmlModel,
  items: readonly AstPackageBodyItem[],
  parentId: string,
  previous?: UmlModel,
): UmlModel {
  let nextModel = model;

  for (const item of items) {
    if (item.itemKind === "nestedPackage") {
      nextModel = addPackageElement(nextModel, item.name, parentId, previous);
      const nestedId = elementIdByName(nextModel, item.name);
      nextModel = addBodyItems(nextModel, item.items, nestedId, previous);
      continue;
    }

    nextModel = addClassifierElement(nextModel, item.classifier, parentId, previous);
  }

  return nextModel;
}

function addPackageTree(
  model: UmlModel,
  pkg: AstPackageDeclaration,
  previous?: UmlModel,
): UmlModel {
  let nextModel = addPackageElement(model, pkg.name, undefined, previous);
  const packageId = elementIdByName(nextModel, pkg.name);
  return addBodyItems(nextModel, pkg.items, packageId, previous);
}

function ensurePackageByName(
  model: UmlModel,
  name: string,
  previous?: UmlModel,
): UmlModel {
  if (model.elements.some((element) => element.name === name)) {
    return model;
  }

  const previousPackage = findPreviousElement(previous, name, "package");
  if (previousPackage !== undefined) {
    return {
      ...model,
      elements: [...model.elements, previousPackage],
    };
  }

  const result = addElement(model, {
    elementType: "package",
    name,
  });
  if (!result.ok) {
    throw new Error(result.error.message);
  }
  return result.value;
}

export function packageAstToModel(ast: PackageDiagramAst, previous?: UmlModel): UmlModel {
  const base = previous ?? emptyModel("package");
  let model: UmlModel = {
    id: base.id,
    kind: "package",
    elements: preservedNonDslElements(previous),
    relationships: [],
  };

  for (const pkg of ast.packages) {
    model = addPackageTree(model, pkg, previous);
  }

  for (const relationship of ast.relationships) {
    model = ensurePackageByName(model, relationship.sourceName, previous);
    model = ensurePackageByName(model, relationship.targetName, previous);

    const sourceId = elementIdByName(model, relationship.sourceName);
    const targetId = elementIdByName(model, relationship.targetName);
    const previousRelationship = findPreviousRelationship(
      previous,
      sourceId,
      targetId,
      relationship.relationshipType,
    );

    const nextRelationship: UmlRelationship = {
      id: previousRelationship?.id ?? createId(),
      relationshipType: relationship.relationshipType,
      sourceId,
      targetId,
    };

    model = {
      ...model,
      relationships: [...model.relationships, nextRelationship],
    };
  }

  return model;
}
