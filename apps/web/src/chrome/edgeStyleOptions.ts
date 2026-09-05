import { assertNever } from "@graphiq/uml-core";
import type { LineStyle, MarkerId, RelationshipNotation } from "@graphiq/uml-notation";
import { getMessageNotation, getRelationshipNotation } from "@graphiq/uml-notation";
import type { MessageSort, RelationshipType, UmlRelationship } from "@graphiq/uml-model";
import type { EdgeRouteStyle } from "@graphiq/uml-layout";
import type { ImplementedDiagramKind, RelationshipTool } from "../store/documentStore.js";
import { relationshipToolsForKind } from "./relationshipTools.js";

export function notationForTool(
  diagramKind: ImplementedDiagramKind,
  tool: RelationshipTool,
): RelationshipNotation {
  switch (diagramKind) {
    case "sequence":
    case "timing":
      return getMessageNotation(tool as MessageSort);
    case "communication":
      if (tool === "message") {
        return getMessageNotation("synchCall");
      }
      return getRelationshipNotation(tool as RelationshipType);
    case "class":
    case "object":
    case "package":
    case "component":
    case "deployment":
    case "profile":
    case "useCase":
    case "compositeStructure":
    case "activity":
    case "stateMachine":
    case "interactionOverview":
      return getRelationshipNotation(tool as RelationshipType);
    default:
      return assertNever(diagramKind);
  }
}

export function notationForRelationship(
  diagramKind: ImplementedDiagramKind,
  relationship: UmlRelationship,
): RelationshipNotation {
  if (relationship.relationshipType === "message") {
    return getMessageNotation(relationship.messageSort);
  }
  if (diagramKind === "sequence" || diagramKind === "timing") {
    return getMessageNotation("synchCall");
  }
  return getRelationshipNotation(relationship.relationshipType);
}

function markerKey(id: MarkerId | null): string {
  return id ?? "none";
}

export function findToolForNotation(
  diagramKind: ImplementedDiagramKind,
  current: RelationshipNotation,
  patch: {
    lineStyle?: LineStyle;
    sourceMarkerId?: MarkerId | null;
    targetMarkerId?: MarkerId | null;
  },
): RelationshipTool | undefined {
  const desired: RelationshipNotation = {
    lineStyle: patch.lineStyle ?? current.lineStyle,
    sourceMarkerId:
      patch.sourceMarkerId !== undefined ? patch.sourceMarkerId : current.sourceMarkerId,
    targetMarkerId:
      patch.targetMarkerId !== undefined ? patch.targetMarkerId : current.targetMarkerId,
  };

  const tools = relationshipToolsForKind(diagramKind);
  const candidates = tools.filter((tool) => {
    const notation = notationForTool(diagramKind, tool.id);
    if (patch.lineStyle !== undefined && notation.lineStyle !== desired.lineStyle) {
      return false;
    }
    if (
      patch.sourceMarkerId !== undefined &&
      markerKey(notation.sourceMarkerId) !== markerKey(desired.sourceMarkerId)
    ) {
      return false;
    }
    if (
      patch.targetMarkerId !== undefined &&
      markerKey(notation.targetMarkerId) !== markerKey(desired.targetMarkerId)
    ) {
      return false;
    }
    return true;
  });

  const scored = candidates.map((tool) => {
    const notation = notationForTool(diagramKind, tool.id);
    let score = 0;
    if (notation.lineStyle === desired.lineStyle) {
      score += 4;
    }
    if (markerKey(notation.sourceMarkerId) === markerKey(desired.sourceMarkerId)) {
      score += 2;
    }
    if (markerKey(notation.targetMarkerId) === markerKey(desired.targetMarkerId)) {
      score += 2;
    }
    return { tool: tool.id, score };
  });

  scored.sort((left, right) => right.score - left.score);
  const best = scored[0];
  if (best === undefined) {
    return undefined;
  }
  return best.tool;
}

export function uniqueMarkers(
  diagramKind: ImplementedDiagramKind,
  end: "source" | "target",
): readonly (MarkerId | null)[] {
  const seen = new Set<string>();
  const markers: (MarkerId | null)[] = [];
  for (const tool of relationshipToolsForKind(diagramKind)) {
    const notation = notationForTool(diagramKind, tool.id);
    const marker = end === "source" ? notation.sourceMarkerId : notation.targetMarkerId;
    const key = markerKey(marker);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    markers.push(marker);
  }
  return markers;
}

export const ROUTE_STYLES: readonly { id: EdgeRouteStyle; label: string }[] = [
  { id: "orthogonal", label: "Orthogonal" },
  { id: "straight", label: "Straight" },
  { id: "bezier", label: "Curve" },
];
