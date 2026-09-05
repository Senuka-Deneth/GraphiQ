import type { Diagnostic } from "@graphiq/uml-core";
import { getElementNotation } from "@graphiq/uml-notation";
import type { NotationOverlay } from "@graphiq/uml-layout";
import type { UmlElement, UmlModel } from "@graphiq/uml-model";
import {
  buildDiagnosticSeverityMap,
  type DiagnosticSeverity,
} from "../../diagnostics/bindDiagnosticSpans.js";
import type { ClassFlowNode, ClassNodeData } from "../class/ClassNode.js";
import { classNodeTypeName } from "../class/ClassNode.js";
import type { NoteFlowNode } from "../class/NoteNode.js";
import { noteNodeTypeName } from "../class/NoteNode.js";
import type { UmlFlowEdge } from "../class/UmlEdge.js";
import { buildUmlFlowEdge } from "../class/UmlEdge.js";
import type { ProfileFrameFlowNode } from "./ProfileFrameNode.js";
import { profileFrameNodeTypeName } from "./ProfileFrameNode.js";

function diagnosticClassName(severity: DiagnosticSeverity | undefined): string | undefined {
  if (severity === "error") {
    return "graphiq-diagnostic-error";
  }
  if (severity === "warning") {
    return "graphiq-diagnostic-warning";
  }
  return undefined;
}

function classifierKeyword(element: UmlElement): string | undefined {
  if (element.elementType === "metaclass") {
    return "«metaclass»";
  }
  return getElementNotation(element.elementType).keyword;
}

function elementToNodeData(
  element: UmlElement,
  overlayNode: NotationOverlay["nodes"][string],
): ClassNodeData {
  if (element.elementType === "enumeration") {
    return {
      label: element.name,
      keyword: classifierKeyword(element),
      attributes: [],
      operations: [],
      literals: [...element.literals],
      width: overlayNode.width,
      height: overlayNode.height,
    };
  }

  if (element.elementType === "stereotype") {
    return {
      label: element.name,
      keyword: classifierKeyword(element),
      attributes: element.attributes,
      operations: [],
      width: overlayNode.width,
      height: overlayNode.height,
    };
  }

  return {
    label: element.name,
    keyword: classifierKeyword(element),
    attributes: [],
    operations: [],
    width: overlayNode.width,
    height: overlayNode.height,
  };
}

export type ProfileCanvasFlowNode = ClassFlowNode | NoteFlowNode | ProfileFrameFlowNode;

export function profileModelToFlow(
  model: UmlModel,
  overlay: NotationOverlay,
  diagnostics: readonly Diagnostic[],
): { nodes: ProfileCanvasFlowNode[]; edges: UmlFlowEdge[] } {
  const severityById = buildDiagnosticSeverityMap(diagnostics);
  const nodes: ProfileCanvasFlowNode[] = [];

  for (const element of model.elements) {
    const overlayNode = overlay.nodes[element.id];
    if (overlayNode === undefined) {
      continue;
    }

    const diagnosticSeverity = severityById.get(element.id);
    const className = diagnosticClassName(diagnosticSeverity);

    if (
      element.elementType === "stereotype" ||
      element.elementType === "metaclass" ||
      element.elementType === "enumeration" ||
      element.elementType === "primitiveType"
    ) {
      nodes.push({
        id: element.id,
        type: classNodeTypeName,
        position: { x: overlayNode.x, y: overlayNode.y },
        data: {
          ...elementToNodeData(element, overlayNode),
          diagnosticSeverity,
        },
        className,
      });
      continue;
    }

    if (element.elementType === "profile") {
      nodes.push({
        id: element.id,
        type: profileFrameNodeTypeName,
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
      });
    }
  }

  const edges: UmlFlowEdge[] = model.relationships.map((relationship) =>
    buildUmlFlowEdge(
      relationship,
      overlay.edges[relationship.id],
      severityById.get(relationship.id),
    ),
  );

  return { nodes, edges };
}
