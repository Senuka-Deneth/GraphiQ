import { getMessageNotation, getRelationshipNotation } from "@graphiq/uml-notation";
import type { EdgeRouteStyle, OverlayEdge } from "@graphiq/uml-layout";
import type { MessageSort, RelationshipType, UmlRelationship } from "@graphiq/uml-model";
import {
  BaseEdge,
  EdgeText,
  useInternalNode,
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
  sourceMultiplicity?: string;
  targetMultiplicity?: string;
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
  const keyword = getRelationshipNotation(relationship.relationshipType).keyword;
  const name = label ?? relationship.name;
  const displayLabel = keyword && !name?.includes(keyword) ? [keyword, name].filter(Boolean).join(" ") : name;
  return {
    id: relationship.id,
    source: relationship.sourceId,
    target: relationship.targetId,
    type: umlEdgeTypeName,
    data: {
      relationshipType: relationship.relationshipType,
      messageSort: relationship.relationshipType === "message" ? relationship.messageSort : undefined,
      label: displayLabel,
      sourceMultiplicity: "sourceMultiplicity" in relationship ? relationship.sourceMultiplicity : undefined,
      targetMultiplicity: "targetMultiplicity" in relationship ? relationship.targetMultiplicity : undefined,
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
  source,
  target,
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
  const sourceNode = useInternalNode(source);
  const targetNode = useInternalNode(target);
  const relationshipType = data?.relationshipType ?? "association";
  const notation =
    relationshipType === "message"
      ? getMessageNotation(data?.messageSort ?? "synchCall")
      : getRelationshipNotation(relationshipType);
  const routeStyle = data?.routeStyle ?? "orthogonal";

  let [edgePath, labelX, labelY] = edgePathForRoute(
    routeStyle,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  );

  const points = data?.waypoints;
  const contains = (node: typeof sourceNode, point: { x: number; y: number } | undefined) => {
    if (!node || !point) return false;
    const origin = node.internals.positionAbsolute;
    return point.x >= origin.x - 2 && point.x <= origin.x + (node.measured.width ?? 0) + 2 &&
      point.y >= origin.y - 2 && point.y <= origin.y + (node.measured.height ?? 0) + 2;
  };
  // ELK routes include obstacle avoidance. Reuse them only while their endpoints
  // still belong to the current nodes (dragging/resizing invalidates the route).
  const routed = routeStyle === "orthogonal" && points && points.length >= 2 &&
    contains(sourceNode, points[0]) && contains(targetNode, points[points.length - 1]);
  if (routed) {
    [edgePath, labelX, labelY] = polylinePath(points);
  }
  const start = routed ? points[0]! : { x: sourceX, y: sourceY };
  const end = routed ? points[points.length - 1]! : { x: targetX, y: targetY };

  const nearStart = routed ? points[1]! : end;
  const nearEnd = routed ? points[points.length - 2]! : start;
  const endLabel = (point: { x: number; y: number }, toward: { x: number; y: number }) => {
    const horizontal = Math.abs(toward.x - point.x) >= Math.abs(toward.y - point.y);
    return horizontal ? { x: point.x + Math.sign(toward.x - point.x) * 20, y: point.y - 12 }
      : { x: point.x + 16, y: point.y + Math.sign(toward.y - point.y) * 22 };
  };
  const sourceLabel = endLabel(start, nearStart), targetLabel = endLabel(end, nearEnd);
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
    <>
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
    {data?.sourceMultiplicity ? <EdgeText x={sourceLabel.x} y={sourceLabel.y} label={data.sourceMultiplicity} labelStyle={{ fontSize: 11 }} /> : null}
    {data?.targetMultiplicity ? <EdgeText x={targetLabel.x} y={targetLabel.y} label={data.targetMultiplicity} labelStyle={{ fontSize: 11 }} /> : null}
    </>
  );
}

/** Place labels on the longest segment, away from endpoint symbols. */
export function polylinePath(points: readonly { x: number; y: number }[]): [string, number, number] {
  let longest = -1;
  let labelX = points[0]?.x ?? 0;
  let labelY = points[0]?.y ?? 0;
  points.slice(1).forEach((point, index) => {
    const previous = points[index]!;
    const length = Math.hypot(point.x - previous.x, point.y - previous.y);
    if (length > longest) { longest = length; labelX = (point.x + previous.x) / 2; labelY = (point.y + previous.y) / 2; }
  });
  return [points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" "), labelX, labelY];
}
