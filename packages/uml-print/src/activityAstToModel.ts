import { createId } from "@graphiq/uml-core";
import type {
  ActivityDiagramAst,
  AstActivityBodyItem,
  AstActivityNode,
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
  relationshipType: "controlFlow" | "objectFlow",
  guard?: string,
): UmlRelationship | undefined {
  if (!previous) {
    return undefined;
  }

  return previous.relationships.find((relationship) => {
    if (
      relationship.sourceId !== sourceId ||
      relationship.targetId !== targetId ||
      relationship.relationshipType !== relationshipType
    ) {
      return false;
    }
    if (relationshipType === "controlFlow" || relationshipType === "objectFlow") {
      return (relationship.guard ?? undefined) === guard;
    }
    return true;
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
  parentId: string | undefined,
  previous?: UmlModel,
): UmlModel {
  const existing = model.elements.find(
    (element) => element.name === name && element.elementType === elementType,
  );
  if (existing !== undefined) {
    if (parentId !== undefined && existing.parentId !== parentId) {
      return {
        ...model,
        elements: model.elements.map((element) =>
          element.id === existing.id ? { ...element, parentId } : element,
        ),
      };
    }
    return model;
  }

  const previousElement = findPreviousElement(previous, name, elementType);
  const element: UmlElement = {
    id: previousElement?.id ?? createId(),
    elementType,
    name,
    ...(parentId !== undefined ? { parentId } : {}),
  } as UmlElement;

  return {
    ...model,
    elements: [...model.elements, element],
  };
}

function nodeKindToElementType(nodeKind: AstActivityNode["nodeKind"]): ElementType {
  switch (nodeKind) {
    case "action":
      return "action";
    case "objectNode":
      return "objectNode";
    case "initialNode":
      return "initialNode";
    case "activityFinalNode":
      return "activityFinalNode";
    case "flowFinalNode":
      return "flowFinalNode";
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
      throw new Error(`Unhandled activity node kind: ${String(unreachable)}`);
    }
  }
}

function addBodyItems(
  model: UmlModel,
  items: readonly AstActivityBodyItem[],
  parentId: string,
  previous?: UmlModel,
): UmlModel {
  let nextModel = model;

  for (const item of items) {
    switch (item.itemKind) {
      case "node":
        nextModel = addNamedElement(
          nextModel,
          nodeKindToElementType(item.node.nodeKind),
          item.node.name,
          parentId,
          previous,
        );
        break;
      case "partition":
        nextModel = addNamedElement(
          nextModel,
          "activityPartition",
          item.partition.name,
          parentId,
          previous,
        );
        {
          const nestedId = nextModel.elements.find(
            (element) =>
              element.name === item.partition.name && element.elementType === "activityPartition",
          )?.id;
          if (nestedId !== undefined) {
            nextModel = addBodyItems(nextModel, item.partition.items, nestedId, previous);
          }
        }
        break;
      case "interruptible":
        nextModel = addNamedElement(
          nextModel,
          "interruptibleActivityRegion",
          item.region.name,
          parentId,
          previous,
        );
        {
          const nestedId = nextModel.elements.find(
            (element) =>
              element.name === item.region.name &&
              element.elementType === "interruptibleActivityRegion",
          )?.id;
          if (nestedId !== undefined) {
            nextModel = addBodyItems(nextModel, item.region.items, nestedId, previous);
          }
        }
        break;
      default: {
        const unreachable: never = item;
        throw new Error(`Unhandled activity body item: ${String(unreachable)}`);
      }
    }
  }

  return nextModel;
}

function implicitTypeForEndpoint(name: string): ElementType | undefined {
  switch (name) {
    case "initial":
      return "initialNode";
    case "final":
      return "activityFinalNode";
    case "flowFinal":
      return "flowFinalNode";
    default:
      return undefined;
  }
}

function ensureEndpoint(
  model: UmlModel,
  name: string,
  previous?: UmlModel,
): UmlModel {
  if (model.elements.some((element) => element.name === name)) {
    return model;
  }

  const implicitType = implicitTypeForEndpoint(name);
  if (implicitType === undefined) {
    return model;
  }

  return addNamedElement(model, implicitType, name, undefined, previous);
}

function elementByName(model: UmlModel, name: string): UmlElement | undefined {
  return model.elements.find((element) => element.name === name);
}

function flowTypeForEndpoints(
  source: UmlElement,
  target: UmlElement,
): "controlFlow" | "objectFlow" {
  if (source.elementType === "objectNode" || target.elementType === "objectNode") {
    return "objectFlow";
  }
  return "controlFlow";
}

export function activityAstToModel(ast: ActivityDiagramAst, previous?: UmlModel): UmlModel {
  const base = previous ?? emptyModel("activity");
  let model: UmlModel = {
    id: base.id,
    kind: "activity",
    elements: preservedNonDslElements(previous),
    relationships: [],
  };

  for (const partition of ast.partitions) {
    model = addNamedElement(model, "activityPartition", partition.name, undefined, previous);
    const partitionId = model.elements.find(
      (element) => element.name === partition.name && element.elementType === "activityPartition",
    )?.id;
    if (partitionId !== undefined) {
      model = addBodyItems(model, partition.items, partitionId, previous);
    }
  }

  for (const region of ast.interruptibles) {
    model = addNamedElement(
      model,
      "interruptibleActivityRegion",
      region.name,
      undefined,
      previous,
    );
    const regionId = model.elements.find(
      (element) =>
        element.name === region.name && element.elementType === "interruptibleActivityRegion",
    )?.id;
    if (regionId !== undefined) {
      model = addBodyItems(model, region.items, regionId, previous);
    }
  }

  for (const node of ast.nodes) {
    model = addNamedElement(
      model,
      nodeKindToElementType(node.nodeKind),
      node.name,
      undefined,
      previous,
    );
  }

  for (const flow of ast.flows) {
    model = ensureEndpoint(model, flow.sourceName, previous);
    model = ensureEndpoint(model, flow.targetName, previous);

    const source = elementByName(model, flow.sourceName);
    const target = elementByName(model, flow.targetName);
    if (source === undefined || target === undefined) {
      continue;
    }

    const relationshipType = flowTypeForEndpoints(source, target);
    const previousRelationship = findPreviousFlow(
      previous,
      source.id,
      target.id,
      relationshipType,
      flow.guard,
    );

    const nextRelationship: UmlRelationship =
      relationshipType === "objectFlow"
        ? {
            id: previousRelationship?.id ?? createId(),
            relationshipType: "objectFlow",
            sourceId: source.id,
            targetId: target.id,
            guard: flow.guard,
          }
        : {
            id: previousRelationship?.id ?? createId(),
            relationshipType: "controlFlow",
            sourceId: source.id,
            targetId: target.id,
            guard: flow.guard,
          };

    model = {
      ...model,
      relationships: [...model.relationships, nextRelationship],
    };
  }

  return model;
}
