import type { Diagnostic } from "@graphiq/uml-core";
import type { NotationOverlay } from "@graphiq/uml-layout";
import type { UmlElement, UmlModel, UmlRelationship } from "@graphiq/uml-model";
import {
  buildDiagnosticSeverityMap,
  type DiagnosticSeverity,
} from "../../diagnostics/bindDiagnosticSpans.js";
import type { NoteFlowNode } from "../class/NoteNode.js";
import { noteNodeTypeName } from "../class/NoteNode.js";
import type { UmlFlowEdge } from "../class/UmlEdge.js";
import { buildUmlFlowEdge } from "../class/UmlEdge.js";
import type { ControlFlowNode, ControlNodeKind } from "../activity/ControlNode.js";
import { controlNodeTypeName } from "../activity/ControlNode.js";
import type { InteractionUseFlowNode } from "./InteractionUseNode.js";
import { interactionUseNodeTypeName } from "./InteractionUseNode.js";

function diagnosticClassName(severity: DiagnosticSeverity | undefined): string | undefined {
  if (severity === "error") {
    return "graphiq-diagnostic-error";
  }
  if (severity === "warning") {
    return "graphiq-diagnostic-warning";
  }
  return undefined;
}

function isControlKind(
  elementType: UmlElement["elementType"],
): elementType is Exclude<ControlNodeKind, "flowFinalNode"> {
  return (
    elementType === "initialNode" ||
    elementType === "activityFinalNode" ||
    elementType === "decisionNode" ||
    elementType === "mergeNode" ||
    elementType === "forkNode" ||
    elementType === "joinNode"
  );
}

function flowLabel(relationship: UmlRelationship): string | undefined {
  if (relationship.relationshipType === "controlFlow" && relationship.guard !== undefined) {
    return `[${relationship.guard}]`;
  }
  return relationship.name;
}

export type InteractionOverviewCanvasFlowNode =
  | InteractionUseFlowNode
  | ControlFlowNode
  | NoteFlowNode;

export function interactionOverviewModelToFlow(
  model: UmlModel,
  overlay: NotationOverlay,
  diagnostics: readonly Diagnostic[] = [],
): { nodes: InteractionOverviewCanvasFlowNode[]; edges: UmlFlowEdge[] } {
  const severityById = buildDiagnosticSeverityMap(diagnostics);
  const nodes: InteractionOverviewCanvasFlowNode[] = [];

  for (const element of model.elements) {
    const layout = overlay.nodes[element.id];
    if (layout === undefined) {
      continue;
    }

    const nodeSeverity = severityById.get(element.id);
    const className = diagnosticClassName(nodeSeverity);

    if (element.elementType === "interactionUse") {
      nodes.push({
        id: element.id,
        type: interactionUseNodeTypeName,
        position: { x: layout.x, y: layout.y },
        data: {
          label: element.name,
          width: layout.width,
          height: layout.height,
          diagnosticSeverity: nodeSeverity,
        },
        className,
      });
      continue;
    }

    if (isControlKind(element.elementType)) {
      nodes.push({
        id: element.id,
        type: controlNodeTypeName,
        position: { x: layout.x, y: layout.y },
        data: {
          label: element.name,
          width: layout.width,
          height: layout.height,
          kind: element.elementType,
          diagnosticSeverity: nodeSeverity,
        },
        className,
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
        className,
      });
    }
  }

  const edges: UmlFlowEdge[] = model.relationships.map((relationship) =>
    buildUmlFlowEdge(
      relationship,
      overlay.edges[relationship.id],
      severityById.get(relationship.id),
      flowLabel(relationship),
    ),
  );

  return { nodes, edges };
}
