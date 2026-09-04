import { getElementNotation, getMessageNotation } from "@graphiq/uml-notation";
import type { CombinedFragmentElement, UmlModel } from "@graphiq/uml-model";
import type { NotationOverlay } from "@graphiq/uml-layout";
import type { Diagnostic } from "@graphiq/uml-core";
import { dashStrokeStyle } from "../class/ClassNode.js";

export type SequenceRenderable = {
  width: number;
  height: number;
  lifelines: readonly SequenceLifelineRender[];
  messages: readonly SequenceMessageRender[];
  executionSpecs: readonly SequenceExecutionRender[];
  combinedFragments: readonly SequenceFragmentRender[];
};

export type SequenceLifelineRender = {
  id: string;
  name: string;
  classifierName?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  centerX: number;
  diagnosticSeverity?: "error" | "warning";
};

export type SequenceMessageRender = {
  id: string;
  label?: string;
  messageSort: "synchCall" | "asynchCall" | "asynchSignal" | "reply" | "createMessage" | "deleteMessage";
  x1: number;
  y: number;
  x2: number;
  markerId: string;
  lineStyle: "solid" | "dash";
  diagnosticSeverity?: "error" | "warning";
};

export type SequenceExecutionRender = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  diagnosticSeverity?: "error" | "warning";
};

export type SequenceFragmentRender = {
  id: string;
  operator: CombinedFragmentElement["operator"];
  x: number;
  y: number;
  width: number;
  height: number;
  diagnosticSeverity?: "error" | "warning";
};

function diagnosticSeverityFor(
  diagnostics: readonly Diagnostic[],
  elementId: string,
): "error" | "warning" | undefined {
  const matches = diagnostics.filter((diagnostic) => diagnostic.elementIds.includes(elementId));
  if (matches.some((diagnostic) => diagnostic.severity === "error")) {
    return "error";
  }
  if (matches.some((diagnostic) => diagnostic.severity === "warning")) {
    return "warning";
  }
  return undefined;
}

export function sequenceModelToSvg(
  model: UmlModel,
  overlay: NotationOverlay,
  diagnostics: readonly Diagnostic[],
): SequenceRenderable {
  const lifelines = model.elements.flatMap((element) => {
    if (element.elementType !== "lifeline") {
      return [];
    }
    const node = overlay.nodes[element.id];
    if (node === undefined) {
      return [];
    }
    return [
      {
        id: element.id,
        name: element.name,
        classifierName: element.classifierName,
        x: node.x,
        y: node.y,
        width: node.width,
        height: node.height,
        centerX: node.x + node.width / 2,
        diagnosticSeverity: diagnosticSeverityFor(diagnostics, element.id),
      },
    ];
  });

  const messages = model.relationships.flatMap((relationship) => {
    if (relationship.relationshipType !== "message") {
      return [];
    }
    const edge = overlay.edges[relationship.id];
    const start = edge?.waypoints?.[0];
    const end = edge?.waypoints?.[1];
    if (start === undefined || end === undefined) {
      return [];
    }
    const notation = getMessageNotation(relationship.messageSort);
    const markerId = notation.targetMarkerId ?? "msg-sync-filled";
    return [
      {
        id: relationship.id,
        label: relationship.name,
        messageSort: relationship.messageSort,
        x1: start.x,
        y: start.y,
        x2: end.x,
        markerId,
        lineStyle: notation.lineStyle,
        diagnosticSeverity: diagnosticSeverityFor(diagnostics, relationship.id),
      },
    ];
  });

  const executionSpecs = model.elements.flatMap((element) => {
    if (element.elementType !== "executionSpecification") {
      return [];
    }
    const node = overlay.nodes[element.id];
    if (node === undefined) {
      return [];
    }
    return [
      {
        id: element.id,
        x: node.x,
        y: node.y,
        width: node.width,
        height: node.height,
        diagnosticSeverity: diagnosticSeverityFor(diagnostics, element.id),
      },
    ];
  });

  const combinedFragments = model.elements.flatMap((element) => {
    if (element.elementType !== "combinedFragment") {
      return [];
    }
    const node = overlay.nodes[element.id];
    if (node === undefined) {
      return [];
    }
    return [
      {
        id: element.id,
        operator: element.operator,
        x: node.x,
        y: node.y,
        width: node.width,
        height: node.height,
        diagnosticSeverity: diagnosticSeverityFor(diagnostics, element.id),
      },
    ];
  });

  const width = Math.max(
    960,
    ...lifelines.map((lifeline) => lifeline.x + lifeline.width + 80),
    ...combinedFragments.map((fragment) => fragment.x + fragment.width + 40),
  );
  const height = Math.max(
    640,
    ...lifelines.map((lifeline) => lifeline.y + lifeline.height + 40),
    ...messages.map((message) => message.y + 80),
  );

  return {
    width,
    height,
    lifelines,
    messages,
    executionSpecs,
    combinedFragments,
  };
}

export function lifelineDisplayName(lifeline: SequenceLifelineRender): string {
  if (lifeline.classifierName !== undefined) {
    return `${lifeline.name}: ${lifeline.classifierName}`;
  }
  return lifeline.name;
}

export function strokeForDiagnostic(severity?: "error" | "warning"): string | undefined {
  if (severity === "error") {
    return "#dc2626";
  }
  if (severity === "warning") {
    return "#d97706";
  }
  return undefined;
}

export function lifelineHeadHeight(): number {
  return getElementNotation("lifeline").minHeight ?? 32;
}

export { dashStrokeStyle };
