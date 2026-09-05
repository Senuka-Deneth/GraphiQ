import type { Diagnostic } from "@graphiq/uml-core";
import type { NotationOverlay } from "@graphiq/uml-layout";
import { isActivityFlowRelationship, type UmlElement, type UmlModel, type UmlRelationship } from "@graphiq/uml-model";
import {
  buildDiagnosticSeverityMap,
  type DiagnosticSeverity,
} from "../../diagnostics/bindDiagnosticSpans.js";
import type { NoteFlowNode } from "../class/NoteNode.js";
import { noteNodeTypeName } from "../class/NoteNode.js";
import type { UmlFlowEdge } from "../class/UmlEdge.js";
import { buildUmlFlowEdge } from "../class/UmlEdge.js";
import type { ActionFlowNode } from "./ActionNode.js";
import { actionNodeTypeName } from "./ActionNode.js";
import type { ControlFlowNode, ControlNodeKind } from "./ControlNode.js";
import { controlNodeTypeName } from "./ControlNode.js";
import type { InterruptibleFlowNode } from "./InterruptibleNode.js";
import { interruptibleNodeTypeName } from "./InterruptibleNode.js";
import type { PartitionFlowNode } from "./PartitionNode.js";
import { partitionNodeTypeName } from "./PartitionNode.js";

function diagnosticClassName(severity: DiagnosticSeverity | undefined): string | undefined {
  if (severity === "error") {
    return "graphiq-diagnostic-error";
  }
  if (severity === "warning") {
    return "graphiq-diagnostic-warning";
  }
  return undefined;
}

function isControlKind(elementType: UmlElement["elementType"]): elementType is ControlNodeKind {
  return (
    elementType === "initialNode" ||
    elementType === "activityFinalNode" ||
    elementType === "flowFinalNode" ||
    elementType === "decisionNode" ||
    elementType === "mergeNode" ||
    elementType === "forkNode" ||
    elementType === "joinNode"
  );
}

function isSpanningBar(model: UmlModel, element: UmlElement): boolean {
  if (element.elementType !== "forkNode" && element.elementType !== "joinNode") {
    return false;
  }

  const partitionOf = (id: string): string => {
    let current = model.elements.find((item) => item.id === id);
    while (current?.parentId !== undefined) {
      const parent = model.elements.find((item) => item.id === current?.parentId);
      if (parent?.elementType === "activityPartition") {
        return parent.id;
      }
      current = parent;
    }
    return "__implicit__";
  };

  const partitions = new Set<string>();
  for (const relationship of model.relationships) {
    if (!isActivityFlowRelationship(relationship)) {
      continue;
    }
    const otherId =
      relationship.sourceId === element.id
        ? relationship.targetId
        : relationship.targetId === element.id
          ? relationship.sourceId
          : undefined;
    if (otherId === undefined) {
      continue;
    }
    partitions.add(partitionOf(otherId));
  }

  return partitions.size >= 2;
}

function parentProps(
  model: UmlModel,
  element: UmlElement,
): { parentId?: string; extent?: "parent" } {
  if (isSpanningBar(model, element) || element.parentId === undefined) {
    return {};
  }
  return { parentId: element.parentId, extent: "parent" };
}

function flowLabel(relationship: UmlRelationship): string | undefined {
  if (isActivityFlowRelationship(relationship) && relationship.guard !== undefined) {
    return `[${relationship.guard}]`;
  }
  return relationship.name;
}

export type ActivityCanvasFlowNode =
  | PartitionFlowNode
  | InterruptibleFlowNode
  | ActionFlowNode
  | ControlFlowNode
  | NoteFlowNode;

export function activityModelToFlow(
  model: UmlModel,
  overlay: NotationOverlay,
  diagnostics: readonly Diagnostic[] = [],
): { nodes: ActivityCanvasFlowNode[]; edges: UmlFlowEdge[] } {
  const severityById = buildDiagnosticSeverityMap(diagnostics);
  const nodes: ActivityCanvasFlowNode[] = [];

  const ordered = [...model.elements].sort((left, right) => {
    const leftIsContainer =
      left.elementType === "activityPartition" || left.elementType === "interruptibleActivityRegion";
    const rightIsContainer =
      right.elementType === "activityPartition" ||
      right.elementType === "interruptibleActivityRegion";
    if (leftIsContainer === rightIsContainer) {
      return 0;
    }
    return leftIsContainer ? -1 : 1;
  });

  for (const element of ordered) {
    const layout = overlay.nodes[element.id];
    if (layout === undefined) {
      continue;
    }

    const nodeSeverity = severityById.get(element.id);
    const className = diagnosticClassName(nodeSeverity);
    const parent = parentProps(model, element);

    if (element.elementType === "activityPartition") {
      nodes.push({
        id: element.id,
        type: partitionNodeTypeName,
        position: { x: layout.x, y: layout.y },
        data: {
          label: element.name,
          width: layout.width,
          height: layout.height,
          diagnosticSeverity: nodeSeverity,
        },
        style: { width: layout.width, height: layout.height },
        className,
        ...parent,
      });
      continue;
    }

    if (element.elementType === "interruptibleActivityRegion") {
      nodes.push({
        id: element.id,
        type: interruptibleNodeTypeName,
        position: { x: layout.x, y: layout.y },
        data: {
          label: element.name,
          width: layout.width,
          height: layout.height,
          diagnosticSeverity: nodeSeverity,
        },
        style: { width: layout.width, height: layout.height },
        className,
        ...parent,
      });
      continue;
    }

    if (element.elementType === "action" || element.elementType === "objectNode") {
      nodes.push({
        id: element.id,
        type: actionNodeTypeName,
        position: { x: layout.x, y: layout.y },
        data: {
          label: element.name,
          width: layout.width,
          height: layout.height,
          kind: element.elementType,
          diagnosticSeverity: nodeSeverity,
        },
        className,
        ...parent,
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
        ...parent,
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
        ...parent,
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
