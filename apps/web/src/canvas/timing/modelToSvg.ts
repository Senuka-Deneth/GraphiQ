import { getMessageNotation } from "@graphiq/uml-notation";
import {
  TIMING_TIME_AXIS_Y,
  timeToX,
  timingAxisTicks,
  timingCanvasHeight,
  timingCanvasWidth,
} from "@graphiq/uml-layout";
import type { UmlModel } from "@graphiq/uml-model";
import type { NotationOverlay } from "@graphiq/uml-layout";
import type { Diagnostic } from "@graphiq/uml-core";
import { dashStrokeStyle } from "../class/ClassNode.js";

export type TimingRenderable = {
  width: number;
  height: number;
  axisY: number;
  ticks: readonly TimingAxisTickRender[];
  lifelines: readonly TimingLifelineRender[];
  states: readonly TimingStateRender[];
  messages: readonly TimingMessageRender[];
};

export type TimingAxisTickRender = {
  time: number;
  x: number;
};

export type TimingLifelineRender = {
  id: string;
  name: string;
  classifierName?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rowCenterY: number;
  diagnosticSeverity?: "error" | "warning";
};

export type TimingStateRender = {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  diagnosticSeverity?: "error" | "warning";
};

export type TimingMessageRender = {
  id: string;
  label?: string;
  x: number;
  y1: number;
  y2: number;
  markerId: string;
  lineStyle: "solid" | "dash";
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

export function timingModelToSvg(
  model: UmlModel,
  overlay: NotationOverlay,
  diagnostics: readonly Diagnostic[],
): TimingRenderable {
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
        rowCenterY: node.y + node.height / 2 + 20,
        diagnosticSeverity: diagnosticSeverityFor(diagnostics, element.id),
      },
    ];
  });

  const states = model.elements.flatMap((element) => {
    if (element.elementType !== "timingState") {
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
        x: node.x,
        y: node.y,
        width: node.width,
        height: node.height,
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
    return [
      {
        id: relationship.id,
        label: relationship.name,
        x: start.x,
        y1: start.y,
        y2: end.y,
        markerId: notation.targetMarkerId ?? "msg-sync-filled",
        lineStyle: notation.lineStyle,
        diagnosticSeverity: diagnosticSeverityFor(diagnostics, relationship.id),
      },
    ];
  });

  const ticks = timingAxisTicks(model).map((time) => ({
    time,
    x: timeToX(time),
  }));

  return {
    width: timingCanvasWidth(model),
    height: timingCanvasHeight(model),
    axisY: TIMING_TIME_AXIS_Y,
    ticks,
    lifelines,
    states,
    messages,
  };
}

export function lifelineDisplayName(lifeline: TimingLifelineRender): string {
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

export function svgXToTime(x: number): number {
  return Math.max(0, Math.round((x - 160) / 12));
}

export { dashStrokeStyle, timeToX };
