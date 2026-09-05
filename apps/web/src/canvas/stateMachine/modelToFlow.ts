import type { Diagnostic } from "@graphiq/uml-core";
import type { NotationOverlay } from "@graphiq/uml-layout";
import {
  isTransitionRelationship,
  type UmlElement,
  type UmlModel,
  type UmlRelationship,
} from "@graphiq/uml-model";
import {
  buildDiagnosticSeverityMap,
  type DiagnosticSeverity,
} from "../../diagnostics/bindDiagnosticSpans.js";
import type { NoteFlowNode } from "../class/NoteNode.js";
import { noteNodeTypeName } from "../class/NoteNode.js";
import type { UmlFlowEdge } from "../class/UmlEdge.js";
import { buildUmlFlowEdge } from "../class/UmlEdge.js";
import type { RegionFlowNode } from "./RegionNode.js";
import { regionNodeTypeName } from "./RegionNode.js";
import type { StateFlowNode } from "./StateNode.js";
import { stateNodeTypeName } from "./StateNode.js";
import type { VertexFlowNode } from "./VertexNode.js";
import { vertexNodeTypeName } from "./VertexNode.js";

const IMPLICIT_REGION_NAME = "__region__";

function diagnosticClassName(severity: DiagnosticSeverity | undefined): string | undefined {
  if (severity === "error") {
    return "graphiq-diagnostic-error";
  }
  if (severity === "warning") {
    return "graphiq-diagnostic-warning";
  }
  return undefined;
}

function stateHasRegions(model: UmlModel, stateId: string): boolean {
  return model.elements.some(
    (element) => element.parentId === stateId && element.elementType === "region",
  );
}

function parentProps(
  element: UmlElement,
): { parentId?: string; extent?: "parent" } {
  if (element.parentId === undefined) {
    return {};
  }
  return { parentId: element.parentId, extent: "parent" };
}

function transitionLabel(relationship: UmlRelationship): string | undefined {
  if (!isTransitionRelationship(relationship)) {
    return relationship.name;
  }

  const parts: string[] = [];
  if (relationship.trigger !== undefined) {
    parts.push(relationship.trigger);
  }
  if (relationship.guard !== undefined) {
    parts.push(`[${relationship.guard}]`);
  }
  if (relationship.effect !== undefined) {
    parts.push(`/ ${relationship.effect}`);
  }
  return parts.length > 0 ? parts.join(" ") : undefined;
}

export type StateMachineCanvasFlowNode =
  | StateFlowNode
  | RegionFlowNode
  | VertexFlowNode
  | NoteFlowNode;

export function stateMachineModelToFlow(
  model: UmlModel,
  overlay: NotationOverlay,
  diagnostics: readonly Diagnostic[] = [],
): { nodes: StateMachineCanvasFlowNode[]; edges: UmlFlowEdge[] } {
  const severityById = buildDiagnosticSeverityMap(diagnostics);
  const nodes: StateMachineCanvasFlowNode[] = [];

  const ordered = [...model.elements].sort((left, right) => {
    const leftIsContainer =
      left.elementType === "state" && stateHasRegions(model, left.id);
    const rightIsContainer =
      right.elementType === "state" && stateHasRegions(model, right.id);
    const leftIsRegion = left.elementType === "region";
    const rightIsRegion = right.elementType === "region";

    if (leftIsContainer !== rightIsContainer) {
      return leftIsContainer ? -1 : 1;
    }
    if (leftIsRegion !== rightIsRegion) {
      return leftIsRegion ? -1 : 1;
    }
    return 0;
  });

  for (const element of ordered) {
    const layout = overlay.nodes[element.id];
    if (layout === undefined) {
      continue;
    }

    const nodeSeverity = severityById.get(element.id);
    const className = diagnosticClassName(nodeSeverity);
    const parent = parentProps(element);

    if (element.elementType === "state") {
      const isComposite = stateHasRegions(model, element.id);
      nodes.push({
        id: element.id,
        type: stateNodeTypeName,
        position: { x: layout.x, y: layout.y },
        data: {
          label: element.name,
          width: layout.width,
          height: layout.height,
          entry: element.entry,
          do: element.do,
          exit: element.exit,
          isComposite,
          diagnosticSeverity: nodeSeverity,
        },
        style: isComposite ? { width: layout.width, height: layout.height } : undefined,
        className,
        ...parent,
      });
      continue;
    }

    if (element.elementType === "region") {
      nodes.push({
        id: element.id,
        type: regionNodeTypeName,
        position: { x: layout.x, y: layout.y },
        data: {
          label: element.name,
          width: layout.width,
          height: layout.height,
          showLabel: element.name !== IMPLICIT_REGION_NAME,
          diagnosticSeverity: nodeSeverity,
        },
        style: { width: layout.width, height: layout.height },
        className,
        ...parent,
      });
      continue;
    }

    if (element.elementType === "pseudostate") {
      nodes.push({
        id: element.id,
        type: vertexNodeTypeName,
        position: { x: layout.x, y: layout.y },
        data: {
          label: element.name,
          width: layout.width,
          height: layout.height,
          kind: element.kind,
          diagnosticSeverity: nodeSeverity,
        },
        className,
        ...parent,
      });
      continue;
    }

    if (element.elementType === "finalState") {
      nodes.push({
        id: element.id,
        type: vertexNodeTypeName,
        position: { x: layout.x, y: layout.y },
        data: {
          label: element.name,
          width: layout.width,
          height: layout.height,
          kind: "finalState",
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
      transitionLabel(relationship),
    ),
  );

  return { nodes, edges };
}
