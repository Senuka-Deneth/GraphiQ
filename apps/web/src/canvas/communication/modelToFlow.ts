import type { Diagnostic } from "@graphiq/uml-core";
import type { NotationOverlay } from "@graphiq/uml-layout";
import type { MessageRelationship, UmlElement, UmlModel, UmlRelationship } from "@graphiq/uml-model";
import {
  buildDiagnosticSeverityMap,
  type DiagnosticSeverity,
} from "../../diagnostics/bindDiagnosticSpans.js";
import type { NoteFlowNode } from "../class/NoteNode.js";
import { noteNodeTypeName } from "../class/NoteNode.js";
import type { UmlFlowEdge } from "../class/UmlEdge.js";
import { umlEdgeTypeName } from "../class/UmlEdge.js";
import type { InstanceFlowNode } from "../object/InstanceNode.js";
import { instanceNodeTypeName } from "../object/InstanceNode.js";

function diagnosticClassName(severity: DiagnosticSeverity | undefined): string | undefined {
  if (severity === "error") {
    return "graphiq-diagnostic-error";
  }
  if (severity === "warning") {
    return "graphiq-diagnostic-warning";
  }
  return undefined;
}

function messageLabel(relationship: MessageRelationship): string {
  const sequenceNumber = relationship.sequenceNumber ?? "1";
  if (relationship.name !== undefined && relationship.name.length > 0) {
    return `${sequenceNumber}: ${relationship.name}`;
  }
  return `${sequenceNumber}:`;
}

function relationshipLabel(relationship: UmlRelationship): string | undefined {
  if (relationship.relationshipType === "message") {
    return messageLabel(relationship);
  }
  return relationship.name;
}

export type CommunicationCanvasFlowNode = InstanceFlowNode | NoteFlowNode;

export function communicationModelToFlow(
  model: UmlModel,
  overlay: NotationOverlay,
  diagnostics: readonly Diagnostic[] = [],
): { nodes: CommunicationCanvasFlowNode[]; edges: UmlFlowEdge[] } {
  const severityById = buildDiagnosticSeverityMap(diagnostics);
  const nodes: CommunicationCanvasFlowNode[] = [];

  for (const element of model.elements) {
    const layout = overlay.nodes[element.id];
    if (layout === undefined) {
      continue;
    }

    const nodeSeverity = severityById.get(element.id);
    const nodeClassName = diagnosticClassName(nodeSeverity);

    if (element.elementType === "instanceSpecification") {
      nodes.push({
        id: element.id,
        type: instanceNodeTypeName,
        position: { x: layout.x, y: layout.y },
        data: {
          instanceName: element.name,
          classifierName: element.classifierName,
          slots: element.slots,
          width: layout.width,
          height: layout.height,
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
    const overlayEdge = overlay.edges[relationship.id];
    return {
      id: relationship.id,
      source: relationship.sourceId,
      target: relationship.targetId,
      type: umlEdgeTypeName,
      data: {
        relationshipType: relationship.relationshipType,
        label: relationshipLabel(relationship),
        waypoints: overlayEdge?.waypoints,
        diagnosticSeverity: edgeSeverity,
      },
      className: diagnosticClassName(edgeSeverity),
      selectable: true,
    };
  });

  return { nodes, edges };
}

export function isCommunicationLayoutElement(
  element: UmlElement,
): element is Extract<UmlElement, { elementType: "instanceSpecification" | "note" }> {
  return element.elementType === "instanceSpecification" || element.elementType === "note";
}
