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
import type { InstanceFlowNode } from "./InstanceNode.js";
import { instanceNodeTypeName } from "./InstanceNode.js";

function diagnosticClassName(severity: DiagnosticSeverity | undefined): string | undefined {
  if (severity === "error") {
    return "graphiq-diagnostic-error";
  }
  if (severity === "warning") {
    return "graphiq-diagnostic-warning";
  }
  return undefined;
}

export type ObjectCanvasFlowNode = InstanceFlowNode | NoteFlowNode;

export function objectModelToFlow(
  model: UmlModel,
  overlay: NotationOverlay,
  diagnostics: readonly Diagnostic[] = [],
): { nodes: ObjectCanvasFlowNode[]; edges: UmlFlowEdge[] } {
  const severityById = buildDiagnosticSeverityMap(diagnostics);
  const nodes: ObjectCanvasFlowNode[] = [];

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

  const edges: UmlFlowEdge[] = model.relationships.map((relationship: UmlRelationship) =>
    buildUmlFlowEdge(
      relationship,
      overlay.edges[relationship.id],
      severityById.get(relationship.id),
    ),
  );

  return { nodes, edges };
}

export function isObjectLayoutElement(
  element: UmlElement,
): element is Extract<UmlElement, { elementType: "instanceSpecification" | "note" }> {
  return element.elementType === "instanceSpecification" || element.elementType === "note";
}
