import { createId } from "@graphiq/uml-core";
import type { AstDeploymentNode, DeploymentDiagramAst } from "@graphiq/uml-dsl";
import {
  emptyModel,
  type UmlElement,
  type UmlModel,
  type UmlRelationship,
} from "@graphiq/uml-model";

function preservedNonDslElements(previous: UmlModel | undefined): UmlElement[] {
  if (!previous) {
    return [];
  }

  return previous.elements.filter((element) => element.elementType === "note");
}

function findPreviousElement(
  previous: UmlModel | undefined,
  name: string,
  elementType: UmlElement["elementType"],
  parentId?: string,
): UmlElement | undefined {
  if (!previous) {
    return undefined;
  }

  return previous.elements.find(
    (element) =>
      element.name === name &&
      element.elementType === elementType &&
      element.parentId === parentId,
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

function addNamedElement(
  model: UmlModel,
  elementType: Extract<
    UmlElement["elementType"],
    "node" | "device" | "executionEnvironment" | "artifact"
  >,
  name: string,
  parentId: string | undefined,
  previous?: UmlModel,
): { model: UmlModel; id: string } {
  const previousElement = findPreviousElement(previous, name, elementType, parentId);
  const element: UmlElement = {
    id: previousElement?.id ?? createId(),
    elementType,
    name,
    ...(parentId !== undefined ? { parentId } : {}),
  };

  return {
    model: {
      ...model,
      elements: [...model.elements.filter((item) => item.id !== element.id), element],
    },
    id: element.id,
  };
}

function addRelationshipIfMissing(
  model: UmlModel,
  relationshipType: Extract<
    UmlRelationship["relationshipType"],
    "communicationPath" | "deployment" | "generalization"
  >,
  sourceId: string,
  targetId: string,
  previous?: UmlModel,
  name?: string,
): UmlModel {
  if (
    model.relationships.some(
      (relationship) =>
        relationship.sourceId === sourceId &&
        relationship.targetId === targetId &&
        relationship.relationshipType === relationshipType,
    )
  ) {
    return model;
  }

  const previousRelationship = findPreviousRelationship(
    previous,
    sourceId,
    targetId,
    relationshipType,
  );

  const nextRelationship: UmlRelationship = {
    id: previousRelationship?.id ?? createId(),
    relationshipType,
    sourceId,
    targetId,
    ...(name !== undefined ? { name } : {}),
  };

  return {
    ...model,
    relationships: [...model.relationships, nextRelationship],
  };
}

function addNodeTree(
  model: UmlModel,
  node: AstDeploymentNode,
  previous?: UmlModel,
): UmlModel {
  const added = addNamedElement(model, node.nodeKind, node.name, undefined, previous);
  let nextModel = added.model;

  for (const item of node.items) {
    nextModel = addNamedElement(nextModel, "artifact", item.name, added.id, previous).model;
  }

  return nextModel;
}

function findNodeishId(model: UmlModel, name: string): string {
  const element = model.elements.find(
    (item) =>
      (item.elementType === "node" ||
        item.elementType === "device" ||
        item.elementType === "executionEnvironment") &&
      item.name === name,
  );
  if (element === undefined) {
    throw new Error(`Node "${name}" was not found`);
  }
  return element.id;
}

function findArtifactId(model: UmlModel, name: string): string {
  const element = model.elements.find(
    (item) => item.elementType === "artifact" && item.name === name,
  );
  if (element === undefined) {
    throw new Error(`Artifact "${name}" was not found`);
  }
  return element.id;
}

export function deploymentAstToModel(
  ast: DeploymentDiagramAst,
  previous?: UmlModel,
): UmlModel {
  const base = previous ?? emptyModel("deployment");
  let model: UmlModel = {
    id: base.id,
    kind: "deployment",
    elements: preservedNonDslElements(previous),
    relationships: [],
  };

  for (const node of ast.nodes) {
    model = addNodeTree(model, node, previous);
  }

  for (const relationship of ast.relationships) {
    switch (relationship.relationshipKind) {
      case "communicationPath": {
        const sourceId = findNodeishId(model, relationship.sourceName);
        const targetId = findNodeishId(model, relationship.targetName);
        model = addRelationshipIfMissing(
          model,
          "communicationPath",
          sourceId,
          targetId,
          previous,
          relationship.name,
        );
        break;
      }
      case "deployment": {
        const sourceId = findArtifactId(model, relationship.sourceName);
        const targetId = findNodeishId(model, relationship.targetName);
        model = addRelationshipIfMissing(model, "deployment", sourceId, targetId, previous);
        break;
      }
      case "generalization": {
        const sourceId = findNodeishId(model, relationship.sourceName);
        const targetId = findNodeishId(model, relationship.targetName);
        model = addRelationshipIfMissing(model, "generalization", sourceId, targetId, previous);
        break;
      }
      default: {
        const exhaustive: never = relationship;
        return exhaustive;
      }
    }
  }

  return model;
}
