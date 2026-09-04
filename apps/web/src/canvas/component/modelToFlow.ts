import type { Diagnostic } from "@graphiq/uml-core";
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
import type { ArtifactFlowNode } from "./ArtifactNode.js";
import { artifactNodeTypeName } from "./ArtifactNode.js";
import type { ComponentFlowNode } from "./ComponentNode.js";
import { componentNodeTypeName } from "./ComponentNode.js";
import type { InterfaceLollipopFlowNode, InterfaceLollipopRole } from "./InterfaceLollipopNode.js";
import { interfaceLollipopNodeTypeName } from "./InterfaceLollipopNode.js";
import type { PortFlowNode } from "./PortNode.js";
import { portNodeTypeName } from "./PortNode.js";

function diagnosticClassName(severity: DiagnosticSeverity | undefined): string | undefined {
  if (severity === "error") {
    return "graphiq-diagnostic-error";
  }
  if (severity === "warning") {
    return "graphiq-diagnostic-warning";
  }
  return undefined;
}

function interfaceRole(model: UmlModel, interfaceId: string): InterfaceLollipopRole {
  const required = model.relationships.some(
    (relationship) =>
      relationship.relationshipType === "usage" && relationship.targetId === interfaceId,
  );
  if (required) {
    return "required";
  }
  return "provided";
}

function parentFields(parentId: string | undefined) {
  return parentId !== undefined ? { parentId, extent: "parent" as const } : {};
}

export type ComponentCanvasFlowNode =
  | ComponentFlowNode
  | InterfaceLollipopFlowNode
  | PortFlowNode
  | ArtifactFlowNode
  | NoteFlowNode;

export function componentModelToFlow(
  model: UmlModel,
  overlay: NotationOverlay,
  diagnostics: readonly Diagnostic[],
): { nodes: ComponentCanvasFlowNode[]; edges: UmlFlowEdge[] } {
  const severityById = buildDiagnosticSeverityMap(diagnostics);
  const nodes: ComponentCanvasFlowNode[] = [];

  for (const element of model.elements) {
    const overlayNode = overlay.nodes[element.id];
    if (overlayNode === undefined) {
      continue;
    }

    const diagnosticSeverity = severityById.get(element.id);
    const className = diagnosticClassName(diagnosticSeverity);
    const parent = parentFields(element.parentId);

    if (element.elementType === "component") {
      nodes.push({
        id: element.id,
        type: componentNodeTypeName,
        position: { x: overlayNode.x, y: overlayNode.y },
        data: {
          label: element.name,
          width: overlayNode.width,
          height: overlayNode.height,
          diagnosticSeverity,
        },
        style: { width: overlayNode.width, height: overlayNode.height },
        className,
        ...parent,
      });
      continue;
    }

    if (element.elementType === "interface") {
      nodes.push({
        id: element.id,
        type: interfaceLollipopNodeTypeName,
        position: { x: overlayNode.x, y: overlayNode.y },
        data: {
          label: element.name,
          role: interfaceRole(model, element.id),
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

    if (element.elementType === "artifact") {
      nodes.push({
        id: element.id,
        type: artifactNodeTypeName,
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

  const edges: UmlFlowEdge[] = model.relationships.flatMap((relationship) => {
    if (
      relationship.relationshipType === "interfaceRealization" ||
      relationship.relationshipType === "usage"
    ) {
      return [];
    }

    const overlayEdge = overlay.edges[relationship.id];
    const diagnosticSeverity = severityById.get(relationship.id);

    return [
      {
        id: relationship.id,
        type: umlEdgeTypeName,
        source: relationship.sourceId,
        target: relationship.targetId,
        data: {
          relationshipType: relationship.relationshipType,
          waypoints: overlayEdge?.waypoints,
          diagnosticSeverity,
        },
        className: diagnosticClassName(diagnosticSeverity),
      },
    ];
  });

  return { nodes, edges };
}
