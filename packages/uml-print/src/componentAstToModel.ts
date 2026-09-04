import { createId } from "@graphiq/uml-core";
import type {
  AstComponentBodyItem,
  AstComponentDeclaration,
  ComponentDiagramAst,
} from "@graphiq/uml-dsl";
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
    "component" | "interface" | "port" | "artifact"
  >,
  name: string,
  parentId: string | undefined,
  previous?: UmlModel,
): { model: UmlModel; id: string } {
  const previousElement = findPreviousElement(previous, name, elementType, parentId);
  const element: UmlElement =
    elementType === "interface"
      ? {
          id: previousElement?.id ?? createId(),
          elementType: "interface",
          name,
          attributes: previousElement?.elementType === "interface" ? previousElement.attributes : [],
          operations: previousElement?.elementType === "interface" ? previousElement.operations : [],
          ...(parentId !== undefined ? { parentId } : {}),
        }
      : {
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
    "interfaceRealization" | "usage" | "assemblyConnector" | "dependency" | "delegationConnector"
  >,
  sourceId: string,
  targetId: string,
  previous?: UmlModel,
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
  };

  return {
    ...model,
    relationships: [...model.relationships, nextRelationship],
  };
}

function addBodyItem(
  model: UmlModel,
  componentId: string,
  item: AstComponentBodyItem,
  previous?: UmlModel,
): UmlModel {
  switch (item.itemKind) {
    case "provides": {
      const added = addNamedElement(model, "interface", item.name, componentId, previous);
      return addRelationshipIfMissing(
        added.model,
        "interfaceRealization",
        componentId,
        added.id,
        previous,
      );
    }
    case "requires": {
      const added = addNamedElement(model, "interface", item.name, componentId, previous);
      return addRelationshipIfMissing(added.model, "usage", componentId, added.id, previous);
    }
    case "port":
      return addNamedElement(model, "port", item.name, componentId, previous).model;
    case "artifact":
      return addNamedElement(model, "artifact", item.name, componentId, previous).model;
    default: {
      const exhaustive: never = item;
      return exhaustive;
    }
  }
}

function addComponentTree(
  model: UmlModel,
  component: AstComponentDeclaration,
  previous?: UmlModel,
): UmlModel {
  const added = addNamedElement(model, "component", component.name, undefined, previous);
  let nextModel = added.model;

  for (const item of component.items) {
    nextModel = addBodyItem(nextModel, added.id, item, previous);
  }

  return nextModel;
}

function findComponentId(model: UmlModel, name: string): string {
  const element = model.elements.find(
    (item) => item.elementType === "component" && item.name === name,
  );
  if (element === undefined) {
    throw new Error(`Component "${name}" was not found`);
  }
  return element.id;
}

function findChildInterfaceId(model: UmlModel, parentId: string, name: string): string {
  const element = model.elements.find(
    (item) =>
      item.elementType === "interface" && item.name === name && item.parentId === parentId,
  );
  if (element === undefined) {
    throw new Error(`Interface "${name}" was not found on its component`);
  }
  return element.id;
}

function findElementIdByName(model: UmlModel, name: string): string {
  const element = model.elements.find((item) => item.name === name);
  if (element === undefined) {
    throw new Error(`Element "${name}" was not found`);
  }
  return element.id;
}

export function componentAstToModel(
  ast: ComponentDiagramAst,
  previous?: UmlModel,
): UmlModel {
  const base = previous ?? emptyModel("component");
  let model: UmlModel = {
    id: base.id,
    kind: "component",
    elements: preservedNonDslElements(previous),
    relationships: [],
  };

  for (const component of ast.components) {
    model = addComponentTree(model, component, previous);
  }

  for (const relationship of ast.relationships) {
    switch (relationship.relationshipKind) {
      case "assembly": {
        const sourceComponentId = findComponentId(model, relationship.sourceComponentName);
        const targetComponentId = findComponentId(model, relationship.targetComponentName);
        const sourceInterfaceId = findChildInterfaceId(
          model,
          sourceComponentId,
          relationship.sourceInterfaceName,
        );
        const targetInterfaceId = findChildInterfaceId(
          model,
          targetComponentId,
          relationship.targetInterfaceName,
        );
        model = addRelationshipIfMissing(
          model,
          "assemblyConnector",
          sourceInterfaceId,
          targetInterfaceId,
          previous,
        );
        break;
      }
      case "dependency": {
        const sourceId = findElementIdByName(model, relationship.sourceName);
        const targetId = findElementIdByName(model, relationship.targetName);
        model = addRelationshipIfMissing(model, "dependency", sourceId, targetId, previous);
        break;
      }
      case "delegation": {
        const sourceId = findElementIdByName(model, relationship.sourceName);
        const targetId = findElementIdByName(model, relationship.targetName);
        model = addRelationshipIfMissing(
          model,
          "delegationConnector",
          sourceId,
          targetId,
          previous,
        );
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
