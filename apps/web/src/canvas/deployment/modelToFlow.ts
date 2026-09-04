import type { Diagnostic } from "@graphiq/uml-core";
import type { NotationOverlay } from "@graphiq/uml-layout";
import type { UmlElement, UmlModel } from "@graphiq/uml-model";
import {
  buildDiagnosticSeverityMap,
  type DiagnosticSeverity,
} from "../../diagnostics/bindDiagnosticSpans.js";
import type { NoteFlowNode } from "../class/NoteNode.js";
import { noteNodeTypeName } from "../class/NoteNode.js";
import type { UmlFlowEdge } from "../class/UmlEdge.js";
import { umlEdgeTypeName } from "../class/UmlEdge.js";
import type { ArtifactFlowNode } from "../component/ArtifactNode.js";
import { artifactNodeTypeName } from "../component/ArtifactNode.js";
import type { DeploymentFlowNode } from "./DeploymentNode.js";
import { deploymentNodeTypeName } from "./DeploymentNode.js";

function diagnosticClassName(severity: DiagnosticSeverity | undefined): string | undefined {
  if (severity === "error") {
    return "graphiq-diagnostic-error";
  }
  if (severity === "warning") {
    return "graphiq-diagnostic-warning";
  }
  return undefined;
}

function isNodeish(element: UmlElement): boolean {
  return (
    element.elementType === "node" ||
    element.elementType === "device" ||
    element.elementType === "executionEnvironment"
  );
}

function nodeKeyword(elementType: UmlElement["elementType"]): string | undefined {
  switch (elementType) {
    case "device":
      return "«device»";
    case "executionEnvironment":
      return "«executionEnvironment»";
    default:
      return undefined;
  }
}

function parentFields(parentId: string | undefined) {
  return parentId !== undefined ? { parentId, extent: "parent" as const } : {};
}

export type DeploymentCanvasFlowNode = DeploymentFlowNode | ArtifactFlowNode | NoteFlowNode;

export function deploymentModelToFlow(
  model: UmlModel,
  overlay: NotationOverlay,
  diagnostics: readonly Diagnostic[],
): { nodes: DeploymentCanvasFlowNode[]; edges: UmlFlowEdge[] } {
  const severityById = buildDiagnosticSeverityMap(diagnostics);
  const nodes: DeploymentCanvasFlowNode[] = [];

  for (const element of model.elements) {
    const overlayNode = overlay.nodes[element.id];
    if (overlayNode === undefined) {
      continue;
    }

    const diagnosticSeverity = severityById.get(element.id);
    const className = diagnosticClassName(diagnosticSeverity);
    const parent = parentFields(element.parentId);

    if (isNodeish(element)) {
      nodes.push({
        id: element.id,
        type: deploymentNodeTypeName,
        position: { x: overlayNode.x, y: overlayNode.y },
        data: {
          label: element.name,
          keyword: nodeKeyword(element.elementType),
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

    if (element.elementType === "artifact" || element.elementType === "deploymentSpecification") {
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

  const edges: UmlFlowEdge[] = model.relationships.map((relationship) => {
    const overlayEdge = overlay.edges[relationship.id];
    const diagnosticSeverity = severityById.get(relationship.id);

    return {
      id: relationship.id,
      type: umlEdgeTypeName,
      source: relationship.sourceId,
      target: relationship.targetId,
      data: {
        relationshipType: relationship.relationshipType,
        label: relationship.name,
        waypoints: overlayEdge?.waypoints,
        diagnosticSeverity,
      },
      className: diagnosticClassName(diagnosticSeverity),
    };
  });

  return { nodes, edges };
}
