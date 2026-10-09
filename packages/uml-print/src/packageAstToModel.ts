import type {
  AstClassifier,
  AstPackageBodyItem,
  AstPackageDeclaration,
  PackageDiagramAst,
} from "@graphiq/uml-dsl";
import { emptyModel, type UmlElement, type UmlModel, type UmlRelationship } from "@graphiq/uml-model";
import { createBuildContext, type BuildContext, type IdentityTable } from "./identity.js";

function preservedNonDslElements(previous: UmlModel | undefined): UmlElement[] {
  if (!previous) {
    return [];
  }

  return previous.elements.filter((element) => element.elementType === "note");
}

function classifierFromAst(classifier: AstClassifier, id: string): UmlElement {
  switch (classifier.classifierKind) {
    case "class":
      return {
        id,
        elementType: "class",
        name: classifier.name,
        isAbstract: classifier.isAbstract,
        attributes: [],
        operations: [],
      };
    case "interface":
      return {
        id,
        elementType: "interface",
        name: classifier.name,
        attributes: [],
        operations: [],
      };
    case "enumeration":
      return {
        id,
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
  span: AstPackageDeclaration["span"] | undefined,
  identity: IdentityTable,
): { model: UmlModel; id: string } {
  const claim = identity.allocateElement({
    elementType: "package",
    name,
    parentId,
    span,
  });
  const element = {
    id: claim.id,
    elementType: "package" as const,
    name,
    ...(parentId !== undefined ? { parentId } : {}),
  };

  return {
    model: {
      ...model,
      elements: [...model.elements.filter((item) => item.id !== element.id), element],
    },
    id: claim.id,
  };
}

function addClassifierElement(
  model: UmlModel,
  classifier: AstClassifier,
  parentId: string | undefined,
  identity: IdentityTable,
): UmlModel {
  const elementType =
    classifier.classifierKind === "class"
      ? "class"
      : classifier.classifierKind === "interface"
        ? "interface"
        : "enumeration";
  const claim = identity.allocateElement({
    elementType,
    name: classifier.name,
    parentId,
    span: classifier.nameSpan,
  });
  const element = classifierFromAst(classifier, claim.id);
  const withParent = parentId !== undefined ? { ...element, parentId } : element;

  return {
    ...model,
    elements: [...model.elements.filter((item) => item.id !== withParent.id), withParent],
  };
}

function addBodyItems(
  model: UmlModel,
  items: readonly AstPackageBodyItem[],
  parentId: string,
  identity: IdentityTable,
): UmlModel {
  let nextModel = model;

  for (const item of items) {
    if (item.itemKind === "nestedPackage") {
      const added = addPackageElement(nextModel, item.name, parentId, item.span, identity);
      nextModel = addBodyItems(added.model, item.items, added.id, identity);
      continue;
    }

    nextModel = addClassifierElement(nextModel, item.classifier, parentId, identity);
  }

  return nextModel;
}

function addPackageTree(
  model: UmlModel,
  pkg: AstPackageDeclaration,
  identity: IdentityTable,
): UmlModel {
  const added = addPackageElement(model, pkg.name, undefined, pkg.span, identity);
  return addBodyItems(added.model, pkg.items, added.id, identity);
}

function packageIdByName(
  model: UmlModel,
  name: string,
  span: PackageDiagramAst["relationships"][number]["span"] | undefined,
  identity: IdentityTable,
): { model: UmlModel; id?: string } {
  const matches = model.elements.filter(
    (element) => element.elementType === "package" && element.name === name,
  );
  if (matches.length === 1) {
    return { model, id: matches[0]?.id };
  }
  if (matches.length > 1) {
    return {
      model,
      id: identity.resolve(model, name, span, { elementType: "package" }),
    };
  }

  const claim = identity.allocateElement({
    elementType: "package",
    name,
    span,
  });
  const element = {
    id: claim.id,
    elementType: "package" as const,
    name,
  };
  return {
    model: {
      ...model,
      elements: [...model.elements, element],
    },
    id: claim.id,
  };
}

export function packageAstToModel(
  ast: PackageDiagramAst,
  previous?: UmlModel,
  context?: BuildContext,
): UmlModel {
  const identity = context?.identity ?? createBuildContext(previous).identity;
  const base = previous ?? emptyModel("package");
  let model: UmlModel = {
    id: base.id,
    kind: "package",
    elements: preservedNonDslElements(previous),
    relationships: [],
  };

  for (const pkg of ast.packages) {
    model = addPackageTree(model, pkg, identity);
  }

  for (const relationship of ast.relationships) {
    const source = packageIdByName(
      model,
      relationship.sourceName,
      relationship.sourceNameSpan ?? relationship.span,
      identity,
    );
    model = source.model;
    const target = packageIdByName(
      model,
      relationship.targetName,
      relationship.targetNameSpan ?? relationship.span,
      identity,
    );
    model = target.model;
    if (source.id === undefined || target.id === undefined) {
      continue;
    }

    const claim = identity.allocateRelationship({
      sourceId: source.id,
      targetId: target.id,
      relationshipType: relationship.relationshipType,
      span: relationship.span,
    });
    const nextRelationship: UmlRelationship = {
      id: claim.id,
      relationshipType: relationship.relationshipType,
      sourceId: source.id,
      targetId: target.id,
    };

    model = {
      ...model,
      relationships: [...model.relationships, nextRelationship],
    };
  }

  return model;
}
