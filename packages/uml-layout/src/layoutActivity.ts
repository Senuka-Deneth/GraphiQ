import { getElementNotation } from "@graphiq/uml-notation";
import { isActivityFlowRelationship, type UmlElement, type UmlModel } from "@graphiq/uml-model";
import type { ElkGraphInput, ElkGraphOutput } from "./elk.js";
import { layoutWithElk } from "./elk.js";
import type { LayoutMode, NotationOverlay, OverlayEdge, OverlayNode } from "./overlay.js";

const PARTITION_HEADER = 32;
const PARTITION_PADDING = 16;
const COLUMN_GAP = 24;
const FORK_JOIN_HEIGHT = 8;
const FORK_JOIN_MIN_WIDTH = 80;
const IMPLICIT_COLUMN_ID = "__graphiq_activity_implicit_column__";

const LAYOUT_ELEMENT_TYPES = new Set<UmlElement["elementType"]>([
  "action",
  "objectNode",
  "initialNode",
  "activityFinalNode",
  "flowFinalNode",
  "decisionNode",
  "mergeNode",
  "forkNode",
  "joinNode",
  "activityPartition",
  "interruptibleActivityRegion",
  "note",
]);

function isLayoutElement(element: UmlElement): boolean {
  return LAYOUT_ELEMENT_TYPES.has(element.elementType);
}

export function measureActivityNode(element: UmlElement): Pick<OverlayNode, "width" | "height"> {
  switch (element.elementType) {
    case "action":
    case "objectNode":
      return { width: 140, height: 48 };
    case "initialNode":
      return { width: 20, height: 20 };
    case "activityFinalNode":
    case "flowFinalNode":
      return { width: 24, height: 24 };
    case "decisionNode":
    case "mergeNode":
      return { width: 36, height: 36 };
    case "forkNode":
    case "joinNode":
      return { width: FORK_JOIN_MIN_WIDTH, height: FORK_JOIN_HEIGHT };
    case "activityPartition":
      return { width: 200, height: 400 };
    case "interruptibleActivityRegion":
      return { width: 180, height: 120 };
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

  return {
    ...overlay,
    nodes,
    edges,
  };
}

function elementById(model: UmlModel, id: string): UmlElement | undefined {
  return model.elements.find((element) => element.id === id);
}

function nearestPartitionId(model: UmlModel, element: UmlElement): string | undefined {
  let current: UmlElement | undefined = element;
  while (current?.parentId !== undefined) {
    const parent = elementById(model, current.parentId);
    if (parent === undefined) {
      return undefined;
    }
    if (parent.elementType === "activityPartition") {
      return parent.id;
    }
    current = parent;
  }
  return undefined;
}

function incidentOtherIds(model: UmlModel, elementId: string): string[] {
  const others: string[] = [];
  for (const relationship of model.relationships) {
    if (!isActivityFlowRelationship(relationship)) {
      continue;
    }
    if (relationship.sourceId === elementId) {
      others.push(relationship.targetId);
    } else if (relationship.targetId === elementId) {
      others.push(relationship.sourceId);
    }
  }
  return others;
}

function isSpanningBar(model: UmlModel, element: UmlElement): boolean {
  if (element.elementType !== "forkNode" && element.elementType !== "joinNode") {
    return false;
  }

  const partitions = new Set<string>();
  for (const otherId of incidentOtherIds(model, element.id)) {
    const other = elementById(model, otherId);
    if (other === undefined) {
      continue;
    }
    partitions.add(nearestPartitionId(model, other) ?? IMPLICIT_COLUMN_ID);
  }

  return partitions.size >= 2;
}

function columnIdFor(model: UmlModel, element: UmlElement): string {
  return nearestPartitionId(model, element) ?? IMPLICIT_COLUMN_ID;
}

function absoluteBox(
  model: UmlModel,
  overlay: NotationOverlay,
  elementId: string,
): OverlayNode | undefined {
  const node = overlay.nodes[elementId];
  if (node === undefined) {
    return undefined;
  }

  const element = elementById(model, elementId);
  if (element === undefined) {
    return node;
  }

  if (isSpanningBar(model, element) || element.parentId === undefined) {
    return node;
  }

  const parent = overlay.nodes[element.parentId];
  if (parent === undefined) {
    return node;
  }

  const parentAbs = absoluteBox(model, overlay, element.parentId) ?? parent;
  return {
    id: node.id,
    x: parentAbs.x + node.x,
    y: parentAbs.y + node.y,
    width: node.width,
    height: node.height,
  };
}

async function layoutColumnNodes(
  model: UmlModel,
  nodeIds: readonly string[],
  overlay: NotationOverlay,
  mode: LayoutMode,
): Promise<{ positions: Map<string, OverlayNode>; layoutIds: string[] }> {
  const layoutIds: string[] = [];
  const children: ElkGraphInput[] = [];

  for (const id of nodeIds) {
    const element = elementById(model, id);
    if (element === undefined) {
      continue;
    }
    const measured = measureActivityNode(element);
    const existing = overlay.nodes[id];
    const shouldPreserve = mode === "incremental" && hasFinitePosition(existing);

    if (!shouldPreserve) {
      layoutIds.push(id);
    }

    children.push({
      id,
      width: shouldPreserve ? existing.width : measured.width,
      height: shouldPreserve ? existing.height : measured.height,
      ...(shouldPreserve
        ? {
            x: existing.x,
            y: existing.y,
            layoutOptions: {
              "org.eclipse.elk.fixed": "true",
            },
          }
        : {}),
    });
  }

  const nodeIdSet = new Set(nodeIds);
  const edges = model.relationships
    .filter(
      (relationship) =>
        isActivityFlowRelationship(relationship) &&
        nodeIdSet.has(relationship.sourceId) &&
        nodeIdSet.has(relationship.targetId),
    )
    .map((relationship) => ({
      id: relationship.id,
      sources: [relationship.sourceId],
      targets: [relationship.targetId],
    }));

  const positions = new Map<string, OverlayNode>();

  if (children.length === 0) {
    return { positions, layoutIds };
  }

  if (layoutIds.length === 0) {
    for (const id of nodeIds) {
      const existing = overlay.nodes[id];
      if (hasFinitePosition(existing)) {
        positions.set(id, existing);
      }
    }
    return { positions, layoutIds };
  }

  const result: ElkGraphOutput = await layoutWithElk({
    id: "activity-column",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": "DOWN",
      "elk.edgeRouting": "ORTHOGONAL",
      "elk.spacing.nodeNode": "32",
      "elk.layered.spacing.nodeNodeBetweenLayers": "48",
    },
    children,
    edges,
  });

  for (const child of result.children ?? []) {
    if (
      child.x === undefined ||
      child.y === undefined ||
      child.width === undefined ||
      child.height === undefined
    ) {
      continue;
    }
    positions.set(child.id, {
      id: child.id,
      x: child.x,
      y: child.y,
      width: child.width,
      height: child.height,
    });
  }

  return { positions, layoutIds };
}

function columnContentSize(positions: Map<string, OverlayNode>): { width: number; height: number } {
  let maxRight = 0;
  let maxBottom = 0;
  for (const node of positions.values()) {
    maxRight = Math.max(maxRight, node.x + node.width);
    maxBottom = Math.max(maxBottom, node.y + node.height);
  }
  return {
    width: Math.max(FORK_JOIN_MIN_WIDTH, maxRight),
    height: Math.max(48, maxBottom),
  };
}

function applyInterruptibleFrames(
  model: UmlModel,
  overlay: NotationOverlay,
  partitionId: string,
): void {
  const regions = model.elements.filter(
    (element) =>
      element.elementType === "interruptibleActivityRegion" && element.parentId === partitionId,
  );

  for (const region of regions) {
    const children = model.elements.filter((element) => element.parentId === region.id);
    const childBoxes = children
      .map((child) => overlay.nodes[child.id])
      .filter((node): node is OverlayNode => node !== undefined);

    if (childBoxes.length === 0) {
      overlay.nodes[region.id] = {
        id: region.id,
        x: PARTITION_PADDING,
        y: PARTITION_HEADER,
        ...measureActivityNode(region),
      };
      continue;
    }

    const minX = Math.min(...childBoxes.map((box) => box.x)) - 8;
    const minY = Math.min(...childBoxes.map((box) => box.y)) - 8;
    const maxX = Math.max(...childBoxes.map((box) => box.x + box.width)) + 8;
    const maxY = Math.max(...childBoxes.map((box) => box.y + box.height)) + 8;

    overlay.nodes[region.id] = {
      id: region.id,
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };

    for (const child of children) {
      const box = overlay.nodes[child.id];
      if (box === undefined) {
        continue;
      }
      overlay.nodes[child.id] = {
        ...box,
        x: box.x - minX,
        y: box.y - minY,
      };
    }
  }
}

function writeCrossEdges(model: UmlModel, overlay: NotationOverlay): void {
  for (const relationship of model.relationships) {
    if (!isActivityFlowRelationship(relationship)) {
      continue;
    }
    const source = absoluteBox(model, overlay, relationship.sourceId);
    const target = absoluteBox(model, overlay, relationship.targetId);
    if (source === undefined || target === undefined) {
      continue;
    }

    overlay.edges[relationship.id] = {
      id: relationship.id,
      waypoints: [
        { x: source.x + source.width / 2, y: source.y + source.height },
        { x: target.x + target.width / 2, y: target.y },
      ],
    };
  }
}

export async function layoutActivity(
  model: UmlModel,
  overlay: NotationOverlay,
  mode: LayoutMode,
): Promise<NotationOverlay> {
  const pruned = pruneOverlay(model, overlay);
  const next: NotationOverlay = {
    ...pruned,
    nodes: { ...pruned.nodes },
    edges: { ...pruned.edges },
  };

  const partitions = model.elements.filter(
    (element) => element.elementType === "activityPartition" && element.parentId === undefined,
  );

  const spanningIds = new Set(
    model.elements.filter((element) => isSpanningBar(model, element)).map((element) => element.id),
  );

  const leafNodes = model.elements.filter(
    (element) =>
      isLayoutElement(element) &&
      element.elementType !== "activityPartition" &&
      element.elementType !== "interruptibleActivityRegion" &&
      !spanningIds.has(element.id),
  );

  const columnNodeIds = new Map<string, string[]>();
  columnNodeIds.set(IMPLICIT_COLUMN_ID, []);
  for (const partition of partitions) {
    columnNodeIds.set(partition.id, []);
  }

  for (const node of leafNodes) {
    const columnId = columnIdFor(model, node);
    const bucket = columnNodeIds.get(columnId) ?? columnNodeIds.get(IMPLICIT_COLUMN_ID);
    if (bucket === undefined) {
      continue;
    }
    bucket.push(node.id);
    if (!columnNodeIds.has(columnId) && columnId !== IMPLICIT_COLUMN_ID) {
      columnNodeIds.set(IMPLICIT_COLUMN_ID, bucket);
    }
  }

  const columnOrder: string[] = [];
  const implicitNodes = columnNodeIds.get(IMPLICIT_COLUMN_ID) ?? [];
  if (implicitNodes.length > 0 || partitions.length === 0) {
    columnOrder.push(IMPLICIT_COLUMN_ID);
  }
  for (const partition of partitions) {
    columnOrder.push(partition.id);
  }

  const columnLayouts = new Map<string, { positions: Map<string, OverlayNode>; size: { width: number; height: number }; layoutIds: string[] }>();

  for (const columnId of columnOrder) {
    const ids = columnNodeIds.get(columnId) ?? [];
    const laidOut = await layoutColumnNodes(model, ids, next, mode);
    columnLayouts.set(columnId, {
      positions: laidOut.positions,
      size: columnContentSize(laidOut.positions),
      layoutIds: laidOut.layoutIds,
    });
  }

  let maxColumnHeight = 0;
  for (const column of columnLayouts.values()) {
    maxColumnHeight = Math.max(
      maxColumnHeight,
      column.size.height + PARTITION_HEADER + PARTITION_PADDING,
    );
  }

  let cursorX = 0;
  for (const columnId of columnOrder) {
    const column = columnLayouts.get(columnId);
    if (column === undefined) {
      continue;
    }

    const isPartition = columnId !== IMPLICIT_COLUMN_ID;
    const columnWidth = column.size.width + (isPartition ? PARTITION_PADDING * 2 : 0);
    const columnHeight = Math.max(maxColumnHeight, column.size.height + PARTITION_HEADER);

    if (isPartition) {
      const existing = next.nodes[columnId];
      const shouldPreserve = mode === "incremental" && hasFinitePosition(existing);
      if (!shouldPreserve) {
        next.nodes[columnId] = {
          id: columnId,
          x: cursorX,
          y: 0,
          width: Math.max(200, columnWidth),
          height: columnHeight,
        };
      }
    }

    const originX = isPartition ? PARTITION_PADDING : cursorX;
    const originY = isPartition ? PARTITION_HEADER : 0;
    const layoutIdSet = new Set(column.layoutIds);

    for (const [nodeId, box] of column.positions) {
      const existing = next.nodes[nodeId];
      if (mode === "incremental" && hasFinitePosition(existing) && !layoutIdSet.has(nodeId)) {
        continue;
      }

      next.nodes[nodeId] = {
        id: nodeId,
        x: box.x + originX,
        y: box.y + originY,
        width: box.width,
        height: box.height,
      };
    }

    if (isPartition) {
      applyInterruptibleFrames(model, next, columnId);
      cursorX += (next.nodes[columnId]?.width ?? columnWidth) + COLUMN_GAP;
    } else {
      cursorX += column.size.width + COLUMN_GAP;
    }
  }

  for (const element of model.elements) {
    if (!spanningIds.has(element.id)) {
      continue;
    }

    const existing = next.nodes[element.id];
    if (mode === "incremental" && hasFinitePosition(existing)) {
      continue;
    }

    const others = incidentOtherIds(model, element.id)
      .map((id) => absoluteBox(model, next, id))
      .filter((box): box is OverlayNode => box !== undefined);

    if (others.length === 0) {
      next.nodes[element.id] = {
        id: element.id,
        x: 0,
        y: 0,
        ...measureActivityNode(element),
      };
      continue;
    }

    const minX = Math.min(...others.map((box) => box.x));
    const maxX = Math.max(...others.map((box) => box.x + box.width));
    const minY = Math.min(...others.map((box) => box.y));
    const maxY = Math.max(...others.map((box) => box.y + box.height));

    next.nodes[element.id] = {
      id: element.id,
      x: minX,
      y: (minY + maxY) / 2 - FORK_JOIN_HEIGHT / 2,
      width: Math.max(FORK_JOIN_MIN_WIDTH, maxX - minX),
      height: FORK_JOIN_HEIGHT,
    };
  }

  for (const element of model.elements) {
    if (!isLayoutElement(element)) {
      continue;
    }
    if (next.nodes[element.id] !== undefined) {
      continue;
    }
    next.nodes[element.id] = {
      id: element.id,
      x: 0,
      y: 0,
      ...measureActivityNode(element),
    };
  }

  writeCrossEdges(model, next);
  return next;
}

export function createActivityFixtureModel(): UmlModel {
  return {
    id: "activity-fixture",
    kind: "activity",
    elements: [
      { id: "part-sales", elementType: "activityPartition", name: "Sales" },
      { id: "part-warehouse", elementType: "activityPartition", name: "Warehouse" },
      {
        id: "action-receive",
        elementType: "action",
        name: "ReceiveOrder",
        parentId: "part-sales",
      },
      {
        id: "action-pack",
        elementType: "action",
        name: "Pack",
        parentId: "part-warehouse",
      },
      {
        id: "action-ship",
        elementType: "action",
        name: "Ship",
        parentId: "part-warehouse",
      },
      { id: "initial", elementType: "initialNode", name: "initial" },
      { id: "final", elementType: "activityFinalNode", name: "final" },
    ],
    relationships: [
      {
        id: "flow-1",
        relationshipType: "controlFlow",
        sourceId: "initial",
        targetId: "action-receive",
      },
      {
        id: "flow-2",
        relationshipType: "controlFlow",
        sourceId: "action-receive",
        targetId: "action-pack",
      },
      {
        id: "flow-3",
        relationshipType: "controlFlow",
        sourceId: "action-pack",
        targetId: "action-ship",
      },
      {
        id: "flow-4",
        relationshipType: "controlFlow",
        sourceId: "action-ship",
        targetId: "final",
      },
    ],
  };
}
