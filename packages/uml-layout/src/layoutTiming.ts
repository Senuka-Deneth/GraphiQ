import { getElementNotation } from "@graphiq/uml-notation";
import type { UmlElement, UmlModel } from "@graphiq/uml-model";
import { timingIntervalsForLifeline } from "@graphiq/uml-model";
import type { LayoutMode, NotationOverlay, OverlayEdge, OverlayNode } from "./overlay.js";

const LABEL_WIDTH = 160;
const ROW_HEIGHT = 72;
const ROW_START_Y = 80;
const ROW_SPACING = 96;
const TIME_SCALE = 12;
const TIME_AXIS_Y = 32;
const PADDING_RIGHT = 80;

const LAYOUT_ELEMENT_TYPES = new Set<UmlElement["elementType"]>([
  "lifeline",
  "timingState",
  "note",
]);

function isLayoutElement(element: UmlElement): boolean {
  return LAYOUT_ELEMENT_TYPES.has(element.elementType);
}

export function measureTimingNode(
  element: UmlElement,
): Pick<OverlayNode, "width" | "height"> {
  switch (element.elementType) {
    case "lifeline": {
      const notation = getElementNotation("lifeline");
      return {
        width: notation.minWidth ?? LABEL_WIDTH,
        height: notation.minHeight ?? 32,
      };
    }
    case "timingState": {
      const notation = getElementNotation("timingState");
      return {
        width: notation.minWidth ?? 80,
        height: notation.minHeight ?? ROW_HEIGHT - 16,
      };
    }
    case "note": {
      const notation = getElementNotation("note");
      return { width: notation.minWidth ?? 120, height: notation.minHeight ?? 60 };
    }
    default:
      return { width: 120, height: 48 };
  }
}

function hasFinitePosition(node: OverlayNode | undefined): node is OverlayNode {
  return (
    node !== undefined &&
    Number.isFinite(node.x) &&
    Number.isFinite(node.y) &&
    Number.isFinite(node.width) &&
    Number.isFinite(node.height)
  );
}

function pruneOverlay(model: UmlModel, overlay: NotationOverlay): NotationOverlay {
  const elementIds = new Set(model.elements.map((element) => element.id));
  const relationshipIds = new Set(model.relationships.map((relationship) => relationship.id));

  const nodes: Record<string, OverlayNode> = {};
  for (const [id, node] of Object.entries(overlay.nodes)) {
    if (elementIds.has(id)) {
      nodes[id] = node;
    }
  }

  const edges: Record<string, OverlayEdge> = {};
  for (const [id, edge] of Object.entries(overlay.edges)) {
    if (relationshipIds.has(id)) {
      edges[id] = edge;
    }
  }

  return { ...overlay, nodes, edges };
}

function timeToX(time: number): number {
  return LABEL_WIDTH + time * TIME_SCALE;
}

function lifelineRowIndexById(model: UmlModel, overlay: NotationOverlay): Map<string, number> {
  const lifelines = model.elements.filter((element) => element.elementType === "lifeline");
  const sorted = [...lifelines].sort((left, right) => {
    const leftY = overlay.nodes[left.id]?.y ?? Number.POSITIVE_INFINITY;
    const rightY = overlay.nodes[right.id]?.y ?? Number.POSITIVE_INFINITY;
    if (leftY !== rightY) {
      return leftY - rightY;
    }
    return left.name.localeCompare(right.name);
  });

  return new Map(sorted.map((lifeline, index) => [lifeline.id, index]));
}

function rowY(index: number): number {
  return ROW_START_Y + index * ROW_SPACING;
}

function maxTimeForModel(model: UmlModel): number {
  let maxTime = 0;
  for (const element of model.elements) {
    if (element.elementType === "timingState") {
      maxTime = Math.max(maxTime, element.at, element.until ?? element.at);
    }
  }
  for (const relationship of model.relationships) {
    if (relationship.relationshipType === "message" && relationship.time !== undefined) {
      maxTime = Math.max(maxTime, relationship.time);
    }
  }
  return maxTime;
}

export function layoutTiming(
  model: UmlModel,
  overlay: NotationOverlay,
  mode: LayoutMode,
): NotationOverlay {
  const pruned = pruneOverlay(model, overlay);
  const nodes = { ...pruned.nodes };
  const edges: Record<string, OverlayEdge> = { ...pruned.edges };

  const lifelines = model.elements.filter((element) => element.elementType === "lifeline");
  const rowIndexByLifelineId = lifelineRowIndexById(model, pruned);

  for (const lifeline of lifelines) {
    const rowIndex = rowIndexByLifelineId.get(lifeline.id) ?? 0;
    const measured = measureTimingNode(lifeline);
    const existing = nodes[lifeline.id];

    if (mode === "incremental" && hasFinitePosition(existing)) {
      nodes[lifeline.id] = {
        ...existing,
        width: measured.width,
        height: measured.height,
      };
    } else {
      nodes[lifeline.id] = {
        id: lifeline.id,
        x: 0,
        y: rowY(rowIndex),
        width: measured.width,
        height: measured.height,
      };
    }
  }

  for (const lifeline of lifelines) {
    const lifelineNode = nodes[lifeline.id];
    if (lifelineNode === undefined) {
      continue;
    }

    const intervals = timingIntervalsForLifeline(model, lifeline.id);
    for (const interval of intervals) {
      const state = model.elements.find((element) => element.id === interval.stateId);
      if (state?.elementType !== "timingState") {
        continue;
      }

      const measured = measureTimingNode(state);
      const intervalWidth = Math.max(0, (interval.end - interval.start) * TIME_SCALE);
      const width =
        intervalWidth > 0 ? Math.max(24, intervalWidth) : Math.max(measured.width, 24);
      nodes[state.id] = {
        id: state.id,
        x: timeToX(interval.start),
        y: lifelineNode.y + 8,
        width,
        height: measured.height,
      };
    }
  }

  for (const relationship of model.relationships) {
    if (relationship.relationshipType !== "message" || relationship.time === undefined) {
      continue;
    }

    const sourceRow = rowIndexByLifelineId.get(relationship.sourceId);
    const targetRow = rowIndexByLifelineId.get(relationship.targetId);
    if (sourceRow === undefined || targetRow === undefined) {
      continue;
    }

    const x = timeToX(relationship.time);
    const sourceY = rowY(sourceRow) + ROW_HEIGHT / 2;
    const targetY = rowY(targetRow) + ROW_HEIGHT / 2;
    edges[relationship.id] = {
      id: relationship.id,
      waypoints: [
        { x, y: sourceY },
        { x, y: targetY },
      ],
    };
  }

  for (const element of model.elements) {
    if (!isLayoutElement(element) || element.elementType === "lifeline" || element.elementType === "timingState") {
      continue;
    }
    if (nodes[element.id] !== undefined) {
      continue;
    }

    const measured = measureTimingNode(element);
    nodes[element.id] = {
      id: element.id,
      x: LABEL_WIDTH,
      y: rowY(lifelines.length),
      width: measured.width,
      height: measured.height,
    };
  }

  return {
    ...pruned,
    nodes,
    edges,
    viewport: {
      x: 0,
      y: 0,
      zoom: 1,
    },
  };
}

export function createTimingFixtureModel(): UmlModel {
  return {
    id: "timing-fixture",
    kind: "timing",
    elements: [
      {
        id: "lifeline-lamp",
        elementType: "lifeline",
        name: "lamp",
        classifierName: "Lamp",
      },
      {
        id: "state-off-0",
        elementType: "timingState",
        name: "Off",
        parentId: "lifeline-lamp",
        at: 0,
      },
      {
        id: "state-on-10",
        elementType: "timingState",
        name: "On",
        parentId: "lifeline-lamp",
        at: 10,
      },
      {
        id: "state-off-40",
        elementType: "timingState",
        name: "Off",
        parentId: "lifeline-lamp",
        at: 40,
      },
    ],
    relationships: [],
  };
}

export function timingAxisTicks(model: UmlModel): number[] {
  const times = new Set<number>();
  for (const element of model.elements) {
    if (element.elementType === "timingState") {
      times.add(element.at);
      if (element.until !== undefined) {
        times.add(element.until);
      }
    }
  }
  for (const relationship of model.relationships) {
    if (relationship.relationshipType === "message" && relationship.time !== undefined) {
      times.add(relationship.time);
    }
  }
  return [...times].sort((left, right) => left - right);
}

export function timingCanvasWidth(model: UmlModel): number {
  return timeToX(maxTimeForModel(model)) + PADDING_RIGHT;
}

export function timingCanvasHeight(model: UmlModel): number {
  const lifelineCount = model.elements.filter(
    (element) => element.elementType === "lifeline",
  ).length;
  return ROW_START_Y + Math.max(lifelineCount, 1) * ROW_SPACING + 40;
}

export const TIMING_TIME_AXIS_Y = TIME_AXIS_Y;
export { timeToX };
