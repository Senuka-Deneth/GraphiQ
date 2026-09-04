import type { Diagnostic } from "@graphiq/uml-core";
import { getElementNotation } from "@graphiq/uml-notation";
import type { NotationOverlay } from "@graphiq/uml-layout";
import type { UmlElement, UmlModel, UmlRelationship } from "@graphiq/uml-model";
import {
  buildDiagnosticSeverityMap,
  type DiagnosticSeverity,
} from "../../diagnostics/bindDiagnosticSpans.js";
import type { ClassNodeData, ClassFlowNode } from "./ClassNode.js";
import { classNodeTypeName } from "./ClassNode.js";
import type { NoteFlowNode } from "./NoteNode.js";
import { noteNodeTypeName } from "./NoteNode.js";
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

function isClassLikeElement(
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

export type CanvasFlowNode = ClassFlowNode | NoteFlowNode;

function diagnosticClassName(severity: DiagnosticSeverity | undefined): string | undefined {
  if (severity === "error") {
    return "graphiq-diagnostic-error";
  }
  if (severity === "warning") {
    return "graphiq-diagnostic-warning";
  }
  return undefined;
}

export function modelToFlow(
  model: UmlModel,
  overlay: NotationOverlay,
  diagnostics: readonly Diagnostic[] = [],
): { nodes: CanvasFlowNode[]; edges: UmlFlowEdge[] } {
  const severityById = buildDiagnosticSeverityMap(diagnostics);
  const nodes: CanvasFlowNode[] = [];

  for (const element of model.elements) {
    const layout = overlay.nodes[element.id];
    if (layout === undefined) {
      continue;
    }

    const nodeSeverity = severityById.get(element.id);
    const nodeClassName = diagnosticClassName(nodeSeverity);

    if (isClassLikeElement(element)) {
      nodes.push({
        id: element.id,
        type: classNodeTypeName,
        position: { x: layout.x, y: layout.y },
        data: {
          ...elementToNodeData(element, layout),
          diagnosticSeverity: nodeSeverity,
        },
        className: nodeClassName,
        draggable: true,
        selectable: true,
      });
      continue;
    }

    if (element.elementType === "note") {
      nodes.push({
        id: element.id,
        type: noteNodeTypeName,
        position: { x: layout.x, y: layout.y },
        data: {
          label: element.name,
          width: layout.width,
          height: layout.height,
          diagnosticSeverity: nodeSeverity,
        },
        className: nodeClassName,
        draggable: true,
        selectable: true,
      });
    }
  }

  const edges: UmlFlowEdge[] = model.relationships.map((relationship: UmlRelationship) => {
    const edgeSeverity = severityById.get(relationship.id);
    return {
      id: relationship.id,
      source: relationship.sourceId,
      target: relationship.targetId,
      type: umlEdgeTypeName,
      data: {
        relationshipType: relationship.relationshipType,
        label: relationship.name,
        diagnosticSeverity: edgeSeverity,
      },
      className: diagnosticClassName(edgeSeverity),
      selectable: true,
    };
  });

  return { nodes, edges };
}
