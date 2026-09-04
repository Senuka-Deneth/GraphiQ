import { getElementNotation } from "@graphiq/uml-notation";
import type { NotationOverlay } from "@graphiq/uml-layout";
import type { UmlElement, UmlModel, UmlRelationship } from "@graphiq/uml-model";
import type { ClassNodeData, ClassFlowNode } from "./ClassNode.js";
import { classNodeTypeName } from "./ClassNode.js";
import type { UmlFlowEdge } from "./UmlEdge.js";
import { umlEdgeTypeName } from "./UmlEdge.js";

function elementToNodeData(element: UmlElement, overlayNode: NotationOverlay["nodes"][string]): ClassNodeData {
  const notation = getElementNotation(element.elementType);

  if (element.elementType === "enumeration") {
    return {
      label: element.name,
      keyword: notation.keyword,
      attributes: [],
      operations: [],
      literals: [...element.literals],
      width: overlayNode.width,
      height: overlayNode.height,
    };
  }

  if (element.elementType === "class") {
    return {
      label: element.name,
      isAbstract: element.isAbstract,
      attributes: element.attributes,
      operations: element.operations,
      width: overlayNode.width,
      height: overlayNode.height,
    };
  }

  if (element.elementType === "interface") {
    return {
      label: element.name,
      keyword: notation.keyword,
      attributes: element.attributes,
      operations: element.operations,
      width: overlayNode.width,
      height: overlayNode.height,
    };
  }

  return {
    label: element.name,
    keyword: notation.keyword,
    attributes: [],
    operations: [],
    width: overlayNode.width,
    height: overlayNode.height,
  };
}

function isCanvasElement(
  element: UmlElement,
): element is Extract<
  UmlElement,
  { elementType: "class" | "interface" | "enumeration" }
> {
  return (
    element.elementType === "class" ||
    element.elementType === "interface" ||
    element.elementType === "enumeration"
  );
}

export function modelToFlow(
  model: UmlModel,
  overlay: NotationOverlay,
): { nodes: ClassFlowNode[]; edges: UmlFlowEdge[] } {
  const nodes: ClassFlowNode[] = [];

  for (const element of model.elements) {
    if (!isCanvasElement(element)) {
      continue;
    }
    const layout = overlay.nodes[element.id];
    if (layout === undefined) {
      continue;
    }

    nodes.push({
      id: element.id,
      type: classNodeTypeName,
      position: { x: layout.x, y: layout.y },
      data: elementToNodeData(element, layout),
      draggable: true,
      selectable: true,
    });
  }

  const edges: UmlFlowEdge[] = model.relationships.map((relationship: UmlRelationship) => ({
    id: relationship.id,
    source: relationship.sourceId,
    target: relationship.targetId,
    type: umlEdgeTypeName,
    data: {
      relationshipType: relationship.relationshipType,
      label: relationship.name,
    },
    selectable: true,
  }));

  return { nodes, edges };
}
