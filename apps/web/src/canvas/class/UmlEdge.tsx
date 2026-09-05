import { getMessageNotation, getRelationshipNotation } from "@graphiq/uml-notation";
import type { EdgeRouteStyle, OverlayEdge } from "@graphiq/uml-layout";
import type { MessageSort, RelationshipType, UmlRelationship } from "@graphiq/uml-model";
import {
  BaseEdge,
  getBezierPath,
  getSmoothStepPath,
  getStraightPath,
  type Edge,
  type EdgeProps,
} from "@xyflow/react";
import { assertNever } from "@graphiq/uml-core";
import { dashStrokeStyle } from "./ClassNode.js";
import { DEFAULT_EDGE_COLOR, DEFAULT_STROKE_WIDTH } from "../canvasDefaults.js";
import type { DiagnosticSeverity } from "../../diagnostics/bindDiagnosticSpans.js";
import { paintedMarkerUrl } from "./markerPaint.js";

export type UmlEdgeData = {
  relationshipType: RelationshipType;
  messageSort?: MessageSort;
  label?: string;
  waypoints?: readonly { x: number; y: number }[];
  diagnosticSeverity?: "error" | "warning";
  routeStyle?: EdgeRouteStyle;
  strokeColor?: string;
  strokeWidth?: number;
};

export const umlEdgeTypeName = "umlEdge" as const;

export type UmlFlowEdge = Edge<UmlEdgeData, typeof umlEdgeTypeName>;

function diagnosticClassName(severity: DiagnosticSeverity | undefined): string | undefined {
  if (severity === "error") {
    return "graphiq-diagnostic-error";
  }
  if (severity === "warning") {
    return "graphiq-diagnostic-warning";
  }
  return undefined;
}

export function buildUmlFlowEdge(
  relationship: UmlRelationship,
  overlayEdge: OverlayEdge | undefined,
  diagnosticSeverity: DiagnosticSeverity | undefined,
  label?: string,
): UmlFlowEdge {
  return {
    id: relationship.id,
    source: relationship.sourceId,
    target: relationship.targetId,
    type: umlEdgeTypeName,
    data: {
      relationshipType: relationship.relationshipType,
      messageSort: relationship.relationshipType === "message" ? relationship.messageSort : undefined,
      label: label ?? relationship.name,
      waypoints: overlayEdge?.waypoints,
      diagnosticSeverity,
      routeStyle: overlayEdge?.routeStyle,
      strokeColor: overlayEdge?.strokeColor,
      strokeWidth: overlayEdge?.strokeWidth,
    },
    className: diagnosticClassName(diagnosticSeverity),
    selectable: true,
  };
}

function edgePathForRoute(
  routeStyle: EdgeRouteStyle,
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
  sourcePosition: EdgeProps["sourcePosition"],
  targetPosition: EdgeProps["targetPosition"],
): [string, number, number, number, number] {
  switch (routeStyle) {
    case "straight":
      return getStraightPath({ sourceX, sourceY, targetX, targetY });
    case "bezier":
      return getBezierPath({
        sourceX,
        sourceY,
        targetX,
        targetY,
        sourcePosition,
        targetPosition,
      });
    case "orthogonal":
      return getSmoothStepPath({
        sourceX,
        sourceY,
        targetX,
        targetY,
        sourcePosition,
        targetPosition,
      });
    default:
      return assertNever(routeStyle);
  }
}

export function UmlEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  markerEnd,
  markerStart,
  style,
}: EdgeProps<UmlFlowEdge>) {
  const relationshipType = data?.relationshipType ?? "association";
  const notation =
    relationshipType === "message"
      ? getMessageNotation(data?.messageSort ?? "synchCall")
      : getRelationshipNotation(relationshipType);
  const routeStyle = data?.routeStyle ?? "orthogonal";

  const [edgePath, labelX, labelY] = edgePathForRoute(
    routeStyle,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  );

  const diagnosticStroke =
    data?.diagnosticSeverity === "error"
      ? "#dc2626"
      : data?.diagnosticSeverity === "warning"
        ? "#d97706"
        : undefined;
  const paint = diagnosticStroke ?? data?.strokeColor ?? DEFAULT_EDGE_COLOR;
  const computedMarkerStart = paintedMarkerUrl(notation.sourceMarkerId, paint);
  const computedMarkerEnd = paintedMarkerUrl(notation.targetMarkerId, paint);

  return (
    <BaseEdge
      id={id}
      path={edgePath}
      labelX={labelX}
      labelY={labelY}
      markerStart={computedMarkerStart ?? markerStart}
      markerEnd={computedMarkerEnd ?? markerEnd}
      label={data?.label}
      interactionWidth={24}
      data-diagnostic={data?.diagnosticSeverity}
      style={{
        ...style,
        stroke: paint,
        strokeWidth: data?.diagnosticSeverity !== undefined ? 2.5 : (data?.strokeWidth ?? DEFAULT_STROKE_WIDTH),
        ...(notation.lineStyle === "dash" ? dashStrokeStyle : {}),
      }}
    />
  );
}
