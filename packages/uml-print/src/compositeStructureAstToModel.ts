import { createId } from "@graphiq/uml-core";
import type {
  AstCompositeStructureBodyItem,
  AstCompositeStructureConnector,
  AstCompositeStructureFrame,
  CompositeStructureDiagramAst,
} from "@graphiq/uml-dsl";
import {
  emptyModel,
  type PartElement,
  type PortElement,
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
      (name === undefined || relationship.name === name),
  );
}

function addFrame(
  model: UmlModel,
  frame: AstCompositeStructureFrame,
  previous?: UmlModel,
): { model: UmlModel; frameId: string } {
  const frameType = frame.frameKind === "class" ? "class" : "component";
  const previousFrame = findPreviousElement(previous, frame.name, frameType);
  const frameElement: UmlElement =
    frameType === "class"
      ? {
          id: previousFrame?.id ?? createId(),
          elementType: "class",
          name: frame.name,
          isAbstract: false,
          attributes: [],
          operations: [],
        }
      : {
          id: previousFrame?.id ?? createId(),
          elementType: "component",
          name: frame.name,
        };

  let nextModel: UmlModel = {
    ...model,
    elements: [...model.elements.filter((item) => item.id !== frameElement.id), frameElement],
  };

  for (const item of frame.items) {
    nextModel = addBodyItem(nextModel, frameElement.id, item, previous);
  }

  return { model: nextModel, frameId: frameElement.id };
}

function addBodyItem(
  model: UmlModel,
  frameId: string,
  item: AstCompositeStructureBodyItem,
  previous?: UmlModel,
): UmlModel {
  if (item.itemKind === "part") {
    const previousPart = findPreviousElement(previous, item.name, "part", frameId);
    const part: PartElement = {
      id: previousPart?.id ?? createId(),
      elementType: "part",
      name: item.name,
      typeName: item.typeName,
      parentId: frameId,
      ...(item.multiplicity !== undefined ? { multiplicity: item.multiplicity } : {}),
    };

    return {
      ...model,
      elements: [...model.elements.filter((element) => element.id !== part.id), part],
    };
  }

  const previousPort = findPreviousElement(previous, item.name, "port", frameId);
  const port: PortElement = {
    id: previousPort?.id ?? createId(),
    elementType: "port",
    name: item.name,
    parentId: frameId,
    ...(item.typeName !== undefined ? { typeName: item.typeName } : {}),
  };

  return {
    ...model,
    elements: [...model.elements.filter((element) => element.id !== port.id), port],
  };
}

function findNamedElement(model: UmlModel, name: string): UmlElement | undefined {
  return model.elements.find((element) => element.name === name);
}

function findPortOnParent(
  model: UmlModel,
  parentId: string,
  portName: string,
  previous?: UmlModel,
): { model: UmlModel; portId: string } {
  const existing = model.elements.find(
    (element) =>
      element.elementType === "port" &&
      element.parentId === parentId &&
      element.name === portName,
  );
  if (existing !== undefined) {
    return { model, portId: existing.id };
  }

  const previousPort = findPreviousElement(previous, portName, "port", parentId);
  const port: PortElement = {
    id: previousPort?.id ?? createId(),
    elementType: "port",
    name: portName,
    parentId,
  };

  return {
    model: {
      ...model,
      elements: [...model.elements, port],
    },
    portId: port.id,
  };
}

function resolveConnectorEnd(
  model: UmlModel,
  end: AstCompositeStructureConnector["sourceEnd"],
  previous?: UmlModel,
): { model: UmlModel; elementId: string } {
  const root = findNamedElement(model, end.rootName);
  if (root === undefined) {
    throw new Error(`Connector end "${end.rootName}" was not found`);
  }

  if (end.portName === undefined) {
    return { model, elementId: root.id };
  }

  if (root.elementType !== "part" && root.elementType !== "port") {
    throw new Error(`Qualified connector end "${end.rootName}.${end.portName}" requires a part root`);
  }

  const resolved = findPortOnParent(model, root.id, end.portName, previous);
  return { model: resolved.model, elementId: resolved.portId };
}

function addConnector(
  model: UmlModel,
  connector: AstCompositeStructureConnector,
  previous?: UmlModel,
): UmlModel {
  let nextModel = model;
  const source = resolveConnectorEnd(nextModel, connector.sourceEnd, previous);
  nextModel = source.model;
  const target = resolveConnectorEnd(nextModel, connector.targetEnd, previous);
  nextModel = target.model;

  const previousRelationship = findPreviousRelationship(
    previous,
    source.elementId,
    target.elementId,
    "connector",
    connector.name,
  );

  const relationship: UmlRelationship = {
    id: previousRelationship?.id ?? createId(),
    relationshipType: "connector",
    sourceId: source.elementId,
    targetId: target.elementId,
    name: connector.name,
  };

  const withoutDuplicate = nextModel.relationships.filter((item) => item.id !== relationship.id);

  return {
    ...nextModel,
    relationships: [...withoutDuplicate, relationship],
  };
}

export function compositeStructureAstToModel(
  ast: CompositeStructureDiagramAst,
  previous?: UmlModel,
): UmlModel {
  const base = previous ?? emptyModel("compositeStructure");
  let model: UmlModel = {
    id: base.id,
    kind: "compositeStructure",
    elements: preservedNonDslElements(previous),
    relationships: [],
  };

  for (const frame of ast.frames) {
    model = addFrame(model, frame, previous).model;
  }

  for (const connector of ast.connectors) {
    model = addConnector(model, connector, previous);
  }

  return model;
}
