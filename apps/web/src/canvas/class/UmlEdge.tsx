import { getRelationshipNotation } from "@graphiq/uml-notation";
import type { RelationshipType } from "@graphiq/uml-model";
import {
  BaseEdge,
  type Edge,
  type EdgeProps,
  getSmoothStepPath,
} from "@xyflow/react";
import { dashStrokeStyle } from "./ClassNode.js";

export type UmlEdgeData = {
  relationshipType: RelationshipType;
  label?: string;
  diagnosticSeverity?: "error" | "warning";
};

export const umlEdgeTypeName = "umlEdge" as const;

function markerUrl(id: string | null): string | undefined {
  return id !== null ? `url(#${id})` : undefined;
}

export type UmlFlowEdge = Edge<UmlEdgeData, typeof umlEdgeTypeName>;

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
  const notation = getRelationshipNotation(relationshipType);

  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  const computedMarkerStart = markerUrl(notation.sourceMarkerId);
  const computedMarkerEnd = markerUrl(notation.targetMarkerId);

  const diagnosticStroke =
    data?.diagnosticSeverity === "error"
      ? "#dc2626"
      : data?.diagnosticSeverity === "warning"
        ? "#d97706"
        : "currentColor";

  return (
    <BaseEdge
      id={id}
      path={edgePath}
      markerStart={computedMarkerStart ?? markerStart}
      markerEnd={computedMarkerEnd ?? markerEnd}
      label={data?.label}
      data-diagnostic={data?.diagnosticSeverity}
      style={{
        ...style,
        stroke: diagnosticStroke,
        strokeWidth: data?.diagnosticSeverity !== undefined ? 2.5 : 1.5,
        ...(notation.lineStyle === "dash" ? dashStrokeStyle : {}),
      }}
    />
  );
}
