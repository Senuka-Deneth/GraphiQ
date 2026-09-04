import type { Diagnostic } from "@graphiq/uml-core";
import { getRelationshipNotation } from "@graphiq/uml-notation";
import type { NotationOverlay } from "@graphiq/uml-layout";
import type { UmlModel } from "@graphiq/uml-model";
import {
  buildDiagnosticSeverityMap,
  type DiagnosticSeverity,
} from "../../diagnostics/bindDiagnosticSpans.js";
import type { NoteFlowNode } from "../class/NoteNode.js";
import { noteNodeTypeName } from "../class/NoteNode.js";
import type { UmlFlowEdge } from "../class/UmlEdge.js";
import { umlEdgeTypeName } from "../class/UmlEdge.js";
import { portNodeTypeName, type PortFlowNode } from "../component/PortNode.js";
import type { FrameFlowNode } from "./FrameNode.js";
import { frameNodeTypeName } from "./FrameNode.js";
import type { PartFlowNode } from "./PartNode.js";
import { partNodeTypeName } from "./PartNode.js";

function diagnosticClassName(severity: DiagnosticSeverity | undefined): string | undefined {
  if (severity === "error") {
    return "graphiq-diagnostic-error";
  }
  if (severity === "warning") {
    return "graphiq-diagnostic-warning";
  }
  return undefined;
}

function parentFields(parentId: string | undefined) {
  return parentId !== undefined ? { parentId, extent: "parent" as const } : {};
}

export type CompositeStructureCanvasFlowNode =
  | FrameFlowNode
  | PartFlowNode
  | PortFlowNode
  | NoteFlowNode;

export function compositeStructureModelToFlow(
  model: UmlModel,
  overlay: NotationOverlay,
  diagnostics: readonly Diagnostic[],
): { nodes: CompositeStructureCanvasFlowNode[]; edges: UmlFlowEdge[] } {
  const severityById = buildDiagnosticSeverityMap(diagnostics);
  const nodes: CompositeStructureCanvasFlowNode[] = [];

  for (const element of model.elements) {
    const overlayNode = overlay.nodes[element.id];
    if (overlayNode === undefined) {
      continue;
    }

    const diagnosticSeverity = severityById.get(element.id);
    const className = diagnosticClassName(diagnosticSeverity);
    const parent = parentFields(element.parentId);

    if (element.elementType === "class" || element.elementType === "component") {
      nodes.push({
        id: element.id,
        type: frameNodeTypeName,
        position: { x: overlayNode.x, y: overlayNode.y },
        data: {
          label: element.name,
          frameKind: element.elementType === "class" ? "class" : "component",
          width: overlayNode.width,
          height: overlayNode.height,
          diagnosticSeverity,
        },
        style: { width: overlayNode.width, height: overlayNode.height },
        className,
      });
      continue;
    }

    if (element.elementType === "part") {
      nodes.push({
        id: element.id,
        type: partNodeTypeName,
        position: { x: overlayNode.x, y: overlayNode.y },
        data: {
          label: element.name,
          typeName: element.typeName,
          multiplicity: element.multiplicity,
          width: overlayNode.width,
          height: overlayNode.height,
          diagnosticSeverity,
        },
        className,
        ...parent,
      });
      continue;
    }

    if (element.elementType === "port") {
      nodes.push({
        id: element.id,
        type: portNodeTypeName,
        position: { x: overlayNode.x, y: overlayNode.y },
        data: {
          label: element.name,
          width: overlayNode.width,
          height: overlayNode.height,
          diagnosticSeverity,
        },
        className,
        ...parent,
      });
      continue;
    }

    if (element.elementType === "note") {
      nodes.push({
        id: element.id,
        type: noteNodeTypeName,
        position: { x: overlayNode.x, y: overlayNode.y },
        data: {
          label: element.name,
          width: overlayNode.width,
          height: overlayNode.height,
          diagnosticSeverity,
        },
        className,
        ...parent,
      });
    }
  }

  const edges: UmlFlowEdge[] = model.relationships.map((relationship) => {
    const overlayEdge = overlay.edges[relationship.id];
    const diagnosticSeverity = severityById.get(relationship.id);
    const notation = getRelationshipNotation(relationship.relationshipType);

    return {
      id: relationship.id,
      type: umlEdgeTypeName,
      source: relationship.sourceId,
      target: relationship.targetId,
      data: {
        relationshipType: relationship.relationshipType,
        label: relationship.name ?? notation.keyword,
        waypoints: overlayEdge?.waypoints,
        diagnosticSeverity,
      },
      className: diagnosticClassName(diagnosticSeverity),
    };
  });

  return { nodes, edges };
}
