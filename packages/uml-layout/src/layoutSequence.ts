import { getElementNotation } from "@graphiq/uml-notation";
import type { UmlElement, UmlModel } from "@graphiq/uml-model";
import type { LayoutMode, NotationOverlay, OverlayEdge, OverlayNode } from "./overlay.js";

const LIFELINE_SPACING = 200;
const LIFELINE_START_X = 100;
const HEAD_Y = 48;
const MESSAGE_Y_START = 140;
const MESSAGE_Y_SPACING = 64;
const LIFELINE_PADDING_BOTTOM = 80;
const EXECUTION_MIN_HEIGHT = 40;

const LAYOUT_ELEMENT_TYPES = new Set<UmlElement["elementType"]>([
  "lifeline",
  "executionSpecification",
  "combinedFragment",
  "destructionOccurrence",
  "note",
]);

function isLayoutElement(element: UmlElement): boolean {
  return LAYOUT_ELEMENT_TYPES.has(element.elementType);
}

export function measureSequenceNode(
  element: UmlElement,
): Pick<OverlayNode, "width" | "height"> {
  switch (element.elementType) {
    case "lifeline": {
      const notation = getElementNotation("lifeline");
      return {
        width: notation.minWidth ?? 180,
        height: notation.minHeight ?? 32,
      };
    }
    case "executionSpecification": {
      const notation = getElementNotation("executionSpecification");
      return {
        width: notation.minWidth ?? 12,
        height: notation.minHeight ?? EXECUTION_MIN_HEIGHT,
      };
    }
    case "combinedFragment": {
      const notation = getElementNotation("combinedFragment");
      return {
        width: notation.minWidth ?? 240,
        height: notation.minHeight ?? 120,
      };
    }
    case "destructionOccurrence":
      return { width: 20, height: 20 };
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

function lifelineIndexById(model: UmlModel, overlay: NotationOverlay): Map<string, number> {
  const lifelines = model.elements.filter((element) => element.elementType === "lifeline");
  const sorted = [...lifelines].sort((left, right) => {
    const leftX = overlay.nodes[left.id]?.x ?? Number.POSITIVE_INFINITY;
    const rightX = overlay.nodes[right.id]?.x ?? Number.POSITIVE_INFINITY;
    if (leftX !== rightX) {
      return leftX - rightX;
    }
    return left.name.localeCompare(right.name);
  });

  return new Map(sorted.map((lifeline, index) => [lifeline.id, index]));
}

function messageY(index: number): number {
  return MESSAGE_Y_START + index * MESSAGE_Y_SPACING;
}

function layoutCombinedFragments(
  model: UmlModel,
  overlay: NotationOverlay,
  messageYById: Map<string, number>,
): Record<string, OverlayNode> {
  const nodes = { ...overlay.nodes };

  for (const element of model.elements) {
    if (element.elementType !== "combinedFragment") {
      continue;
    }

    const messageIds = element.operands.flatMap((operand) => operand.messageIds);
    const messageYs = messageIds
      .map((messageId) => messageYById.get(messageId))
      .filter((value): value is number => value !== undefined);

    if (messageYs.length === 0) {
      nodes[element.id] = {
        id: element.id,
        x: LIFELINE_START_X - 20,
        y: HEAD_Y,
        ...measureSequenceNode(element),
      };
      continue;
    }

    const lifelineIds = new Set<string>();
    for (const messageId of messageIds) {
      const relationship = model.relationships.find((item) => item.id === messageId);
      if (relationship !== undefined) {
        lifelineIds.add(relationship.sourceId);
        lifelineIds.add(relationship.targetId);
      }
    }

    const lifelineXs = [...lifelineIds]
      .map((lifelineId) => overlay.nodes[lifelineId]?.x)
      .filter((value): value is number => value !== undefined);

    const minX = lifelineXs.length > 0 ? Math.min(...lifelineXs) - 24 : LIFELINE_START_X - 20;
    const maxX =
      lifelineXs.length > 0
        ? Math.max(
            ...Array.from(lifelineIds).map((lifelineId) => {
              const node = overlay.nodes[lifelineId];
              return node !== undefined ? node.x + node.width : LIFELINE_START_X;
            }),
          ) + 24
        : minX + 240;
    const minY = Math.min(...messageYs) - 28;
    const maxY = Math.max(...messageYs) + 28;

    nodes[element.id] = {
      id: element.id,
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }

  return nodes;
}

export async function layoutSequence(
  model: UmlModel,
  overlay: NotationOverlay,
  mode: LayoutMode,
): Promise<NotationOverlay> {
  const pruned = pruneOverlay(model, overlay);
  const lifelines = model.elements.filter((element) => element.elementType === "lifeline");
  const lifelineOrder = lifelineIndexById(model, pruned);

  const nodes: Record<string, OverlayNode> = { ...pruned.nodes };
  const edges: Record<string, OverlayEdge> = {};

  let maxMessageY = HEAD_Y;

  lifelines.forEach((lifeline) => {
    const measured = measureSequenceNode(lifeline);
    const existing = nodes[lifeline.id];
    const index = lifelineOrder.get(lifeline.id) ?? 0;
    const defaultX = LIFELINE_START_X + index * LIFELINE_SPACING;

    nodes[lifeline.id] = {
      id: lifeline.id,
      x:
        mode === "incremental" && hasFinitePosition(existing)
          ? existing.x
          : defaultX,
      y: HEAD_Y,
      width: measured.width,
      height: measured.height,
    };
  });

  const messageYById = new Map<string, number>();
  model.relationships.forEach((relationship, index) => {
    if (relationship.relationshipType !== "message") {
      return;
    }

    const y = messageY(index);
    messageYById.set(relationship.id, y);
    maxMessageY = Math.max(maxMessageY, y);

    const sourceNode = nodes[relationship.sourceId];
    const targetNode = nodes[relationship.targetId];
    if (sourceNode === undefined || targetNode === undefined) {
      return;
    }

    const sourceX = sourceNode.x + sourceNode.width / 2;
    const targetX = targetNode.x + targetNode.width / 2;
    edges[relationship.id] = {
      id: relationship.id,
      waypoints: [
        { x: sourceX, y },
        { x: targetX, y },
      ],
    };

    if (relationship.messageSort === "createMessage") {
      nodes[relationship.targetId] = {
        ...targetNode,
        y: Math.max(targetNode.y, y - targetNode.height / 2),
      };
    }
  });

  for (const element of model.elements) {
    if (element.elementType !== "executionSpecification") {
      continue;
    }

    const parent = element.parentId !== undefined ? nodes[element.parentId] : undefined;
    const startY =
      element.startMessageId !== undefined
        ? messageYById.get(element.startMessageId)
        : undefined;
    const finishY =
      element.finishMessageId !== undefined
        ? messageYById.get(element.finishMessageId)
        : startY;

    if (parent === undefined || startY === undefined) {
      continue;
    }

    const top = Math.min(startY, finishY ?? startY);
    const bottom = Math.max(startY, finishY ?? startY + EXECUTION_MIN_HEIGHT);
    const measured = measureSequenceNode(element);

    nodes[element.id] = {
      id: element.id,
      x: parent.x + parent.width / 2 - measured.width / 2,
      y: top,
      width: measured.width,
      height: Math.max(measured.height, bottom - top),
    };
    maxMessageY = Math.max(maxMessageY, bottom);
  }

  for (const lifeline of lifelines) {
    const node = nodes[lifeline.id];
    if (node === undefined) {
      continue;
    }
    nodes[lifeline.id] = {
      ...node,
      height: Math.max(node.height, maxMessageY - node.y + LIFELINE_PADDING_BOTTOM),
    };
  }

  for (const element of model.elements) {
    if (!isLayoutElement(element)) {
      continue;
    }
    if (nodes[element.id] !== undefined) {
      continue;
    }

    const measured = measureSequenceNode(element);
    nodes[element.id] = {
      id: element.id,
      x: LIFELINE_START_X,
      y: maxMessageY + LIFELINE_PADDING_BOTTOM,
      width: measured.width,
      height: measured.height,
    };
  }

  const fragmentNodes = layoutCombinedFragments(model, { ...pruned, nodes, edges }, messageYById);

  return {
    ...pruned,
    nodes: fragmentNodes,
    edges,
  };
}

export function createSequenceFixtureModel(): UmlModel {
  return {
    id: "sequence-fixture",
    kind: "sequence",
    elements: [
      { id: "lifeline-customer", elementType: "lifeline", name: "customer", classifierName: "Actor" },
      { id: "lifeline-shop", elementType: "lifeline", name: "shop", classifierName: "Shop" },
      { id: "lifeline-pay", elementType: "lifeline", name: "pay", classifierName: "Payments" },
      {
        id: "exec-charge",
        elementType: "executionSpecification",
        name: "exec-charge",
        parentId: "lifeline-pay",
        startMessageId: "msg-charge",
        finishMessageId: "msg-ok",
      },
    ],
    relationships: [
      {
        id: "msg-place",
        relationshipType: "message",
        sourceId: "lifeline-customer",
        targetId: "lifeline-shop",
        messageSort: "synchCall",
        name: "placeOrder()",
      },
      {
        id: "msg-charge",
        relationshipType: "message",
        sourceId: "lifeline-shop",
        targetId: "lifeline-pay",
        messageSort: "synchCall",
        name: "charge()",
      },
      {
        id: "msg-ok",
        relationshipType: "message",
        sourceId: "lifeline-pay",
        targetId: "lifeline-shop",
        messageSort: "reply",
        name: "ok",
      },
      {
        id: "msg-confirm",
        relationshipType: "message",
        sourceId: "lifeline-shop",
        targetId: "lifeline-customer",
        messageSort: "reply",
        name: "confirmation",
      },
    ],
  };
}
