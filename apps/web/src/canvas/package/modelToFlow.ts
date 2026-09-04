import type { Diagnostic } from "@graphiq/uml-core";
import { getElementNotation } from "@graphiq/uml-notation";
import type { NotationOverlay } from "@graphiq/uml-layout";
import type { UmlElement, UmlModel } from "@graphiq/uml-model";
import {
  buildDiagnosticSeverityMap,
  type DiagnosticSeverity,
} from "../../diagnostics/bindDiagnosticSpans.js";
import type { ClassNodeData, ClassFlowNode } from "../class/ClassNode.js";
import { classNodeTypeName } from "../class/ClassNode.js";
import type { NoteFlowNode } from "../class/NoteNode.js";
import { noteNodeTypeName } from "../class/NoteNode.js";
import type { UmlFlowEdge } from "../class/UmlEdge.js";
import { umlEdgeTypeName } from "../class/UmlEdge.js";
import type { PackageFlowNode } from "./PackageNode.js";
import { packageNodeTypeName } from "./PackageNode.js";

function diagnosticClassName(severity: DiagnosticSeverity | undefined): string | undefined {
  if (severity === "error") {
    return "graphiq-diagnostic-error";
  }
  if (severity === "warning") {
    return "graphiq-diagnostic-warning";
  }
  return undefined;
}

function classifierToNodeData(
  element: Extract<UmlElement, { elementType: "class" | "interface" | "enumeration" }>,
  overlayNode: NotationOverlay["nodes"][string],
): ClassNodeData {
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

  return {
    label: element.name,
    keyword: notation.keyword,
    attributes: element.attributes,
    operations: element.operations,
    width: overlayNode.width,
    height: overlayNode.height,
  };
}

function isClassifierElement(
  element: UmlElement,
): element is Extract<UmlElement, { elementType: "class" | "interface" | "enumeration" }> {
  return (
    element.elementType === "class" ||
    element.elementType === "interface" ||
    element.elementType === "enumeration"
  );
}

export type PackageCanvasFlowNode = PackageFlowNode | ClassFlowNode | NoteFlowNode;

export function packageModelToFlow(
  model: UmlModel,
  overlay: NotationOverlay,
  diagnostics: readonly Diagnostic[],
): { nodes: PackageCanvasFlowNode[]; edges: UmlFlowEdge[] } {
  const severityById = buildDiagnosticSeverityMap(diagnostics);

  const nodes: PackageCanvasFlowNode[] = [];

  for (const element of model.elements) {
    const overlayNode = overlay.nodes[element.id];
    if (overlayNode === undefined) {
      continue;
    }

    const diagnosticSeverity = severityById.get(element.id);
    const className = diagnosticClassName(diagnosticSeverity);

    if (element.elementType === "package") {
      nodes.push({
        id: element.id,
        type: packageNodeTypeName,
        position: { x: overlayNode.x, y: overlayNode.y },
        data: {
          label: element.name,
          width: overlayNode.width,
          height: overlayNode.height,
          diagnosticSeverity,
        },
        style: { width: overlayNode.width, height: overlayNode.height },
        className,
        ...(element.parentId !== undefined
          ? { parentId: element.parentId, extent: "parent" as const }
          : {}),
      });
      continue;
    }

    if (isClassifierElement(element)) {
      nodes.push({
        id: element.id,
        type: classNodeTypeName,
        position: { x: overlayNode.x, y: overlayNode.y },
        data: {
          ...classifierToNodeData(element, overlayNode),
          diagnosticSeverity,
        },
        className,
        ...(element.parentId !== undefined
          ? { parentId: element.parentId, extent: "parent" as const }
          : {}),
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
        ...(element.parentId !== undefined
          ? { parentId: element.parentId, extent: "parent" as const }
          : {}),
      });
    }
  }

  const edges: UmlFlowEdge[] = model.relationships.flatMap((relationship) => {
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
