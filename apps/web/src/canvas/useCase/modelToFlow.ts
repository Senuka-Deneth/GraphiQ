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
import { buildUmlFlowEdge } from "../class/UmlEdge.js";
import type { ActorFlowNode } from "./ActorNode.js";
import { actorNodeTypeName } from "./ActorNode.js";
import type { SubjectFlowNode } from "./SubjectNode.js";
import { subjectNodeTypeName } from "./SubjectNode.js";
import type { UseCaseFlowNode } from "./UseCaseNode.js";
import { useCaseNodeTypeName } from "./UseCaseNode.js";

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

export type UseCaseCanvasFlowNode =
  | ActorFlowNode
  | UseCaseFlowNode
  | SubjectFlowNode
  | NoteFlowNode;

export function useCaseModelToFlow(
  model: UmlModel,
  overlay: NotationOverlay,
  diagnostics: readonly Diagnostic[],
): { nodes: UseCaseCanvasFlowNode[]; edges: UmlFlowEdge[] } {
  const severityById = buildDiagnosticSeverityMap(diagnostics);
  const nodes: UseCaseCanvasFlowNode[] = [];

  for (const element of model.elements) {
    const overlayNode = overlay.nodes[element.id];
    if (overlayNode === undefined) {
      continue;
    }

    const diagnosticSeverity = severityById.get(element.id);
    const className = diagnosticClassName(diagnosticSeverity);
    const parent = parentFields(element.parentId);

    if (element.elementType === "actor") {
      nodes.push({
        id: element.id,
        type: actorNodeTypeName,
        position: { x: overlayNode.x, y: overlayNode.y },
        data: {
          label: element.name,
          width: overlayNode.width,
          height: overlayNode.height,
          diagnosticSeverity,
        },
        className,
      });
      continue;
    }

    if (element.elementType === "subject") {
      nodes.push({
        id: element.id,
        type: subjectNodeTypeName,
        position: { x: overlayNode.x, y: overlayNode.y },
        data: {
          label: element.name,
          width: overlayNode.width,
          height: overlayNode.height,
          diagnosticSeverity,
        },
        style: { width: overlayNode.width, height: overlayNode.height },
        className,
      });
      continue;
    }

    if (element.elementType === "useCase") {
      nodes.push({
        id: element.id,
        type: useCaseNodeTypeName,
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
    const notation = getRelationshipNotation(relationship.relationshipType);
    return buildUmlFlowEdge(
      relationship,
      overlay.edges[relationship.id],
      severityById.get(relationship.id),
      relationship.name ?? notation.keyword,
    );
  });

  return { nodes, edges };
}
