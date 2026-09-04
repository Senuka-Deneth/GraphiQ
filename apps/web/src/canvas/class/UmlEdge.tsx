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

  return (
    <BaseEdge
      id={id}
      path={edgePath}
      markerStart={computedMarkerStart ?? markerStart}
      markerEnd={computedMarkerEnd ?? markerEnd}
      label={data?.label}
      style={{
        ...style,
        stroke: "currentColor",
        strokeWidth: 1.5,
        ...(notation.lineStyle === "dash" ? dashStrokeStyle : {}),
      }}
    />
  );
}
