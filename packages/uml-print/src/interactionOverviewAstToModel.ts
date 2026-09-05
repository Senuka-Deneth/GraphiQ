import { createId } from "@graphiq/uml-core";
import type {
  AstInteractionOverviewNodeKind,
  InteractionOverviewDiagramAst,
} from "@graphiq/uml-dsl";
import {
  emptyModel,
  type ElementType,
  type UmlElement,
  type UmlModel,
  type UmlRelationship,
} from "@graphiq/uml-model";

function findPreviousElement(
  previous: UmlModel | undefined,
  name: string,
  elementType: ElementType,
): UmlElement | undefined {
  if (!previous) {
    return undefined;
  }

  return previous.elements.find(
    (element) => element.name === name && element.elementType === elementType,
  );
}

function findPreviousFlow(
  previous: UmlModel | undefined,
  sourceId: string,
  targetId: string,
  guard?: string,
): UmlRelationship | undefined {
  if (!previous) {
    return undefined;
  }

  return previous.relationships.find((relationship) => {
    if (
      relationship.sourceId !== sourceId ||
      relationship.targetId !== targetId ||
      relationship.relationshipType !== "controlFlow"
    ) {
      return false;
    }
    return (relationship.guard ?? undefined) === guard;
  });
}

function preservedNonDslElements(previous: UmlModel | undefined): UmlElement[] {
  if (!previous) {
    return [];
  }

  return previous.elements.filter((element) => element.elementType === "note");
}

function addNamedElement(
  model: UmlModel,
  elementType: ElementType,
  name: string,
  previous?: UmlModel,
): UmlModel {
  const existing = model.elements.find(
    (element) => element.name === name && element.elementType === elementType,
  );
  if (existing !== undefined) {
    return model;
  }

  const previousElement = findPreviousElement(previous, name, elementType);
  const element: UmlElement = {
    id: previousElement?.id ?? createId(),
    elementType,
    name,
  } as UmlElement;

  return {
    ...model,
    elements: [...model.elements, element],
  };
}

function nodeKindToElementType(nodeKind: AstInteractionOverviewNodeKind): ElementType {
  switch (nodeKind) {
    case "interactionUse":
      return "interactionUse";
    case "initialNode":
      return "initialNode";
    case "activityFinalNode":
      return "activityFinalNode";
    case "decisionNode":
      return "decisionNode";
    case "mergeNode":
      return "mergeNode";
    case "forkNode":
      return "forkNode";
    case "joinNode":
      return "joinNode";
    default: {
      const unreachable: never = nodeKind;
      throw new Error(`Unhandled interaction overview node kind: ${String(unreachable)}`);
    }
  }
}

function implicitTypeForEndpoint(name: string, isRef: boolean): ElementType | undefined {
  if (isRef) {
    return "interactionUse";
  }
  switch (name) {
    case "initial":
      return "initialNode";
    case "final":
      return "activityFinalNode";
    default:
      return undefined;
  }
}

function ensureEndpoint(
  model: UmlModel,
  name: string,
  isRef: boolean,
  previous?: UmlModel,
): UmlModel {
  const implicitType = implicitTypeForEndpoint(name, isRef);
  if (implicitType !== undefined) {
    return addNamedElement(model, implicitType, name, previous);
  }

  if (model.elements.some((element) => element.name === name)) {
    return model;
  }

  return model;
}

function elementByName(model: UmlModel, name: string): UmlElement | undefined {
  return model.elements.find((element) => element.name === name);
}

export function interactionOverviewAstToModel(
  ast: InteractionOverviewDiagramAst,
  previous?: UmlModel,
): UmlModel {
  const base = previous ?? emptyModel("interactionOverview");
  let model: UmlModel = {
    id: base.id,
    kind: "interactionOverview",
    elements: preservedNonDslElements(previous),
    relationships: [],
  };

  for (const node of ast.nodes) {
    model = addNamedElement(model, nodeKindToElementType(node.nodeKind), node.name, previous);
  }

  for (const flow of ast.flows) {
    model = ensureEndpoint(model, flow.sourceName, flow.sourceIsRef, previous);
    model = ensureEndpoint(model, flow.targetName, flow.targetIsRef, previous);

    const source = elementByName(model, flow.sourceName);
    const target = elementByName(model, flow.targetName);
    if (source === undefined || target === undefined) {
      continue;
    }

    const previousRelationship = findPreviousFlow(previous, source.id, target.id, flow.guard);
    const nextRelationship: UmlRelationship = {
      id: previousRelationship?.id ?? createId(),
      relationshipType: "controlFlow",
      sourceId: source.id,
      targetId: target.id,
      ...(flow.guard !== undefined ? { guard: flow.guard } : {}),
    };

    model = {
      ...model,
      relationships: [...model.relationships, nextRelationship],
    };
  }

  return model;
}
