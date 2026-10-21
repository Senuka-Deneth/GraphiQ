import { getElementNotation } from "@graphiq/uml-notation";
import type { CombinedFragmentElement, LifelineElement, UmlElement, UmlModel } from "@graphiq/uml-model";
import type { LayoutMode, NotationOverlay, OverlayEdge, OverlayNode } from "./overlay.js";

const LABEL_MAX_CHARS = 22;

export function sequenceLifelineCaption(element: Pick<LifelineElement, "name" | "classifierName">): string {
  return element.classifierName !== undefined && element.classifierName.length > 0
    ? `${element.name}: ${element.classifierName}`
    : element.name;
}

export function wrapSequenceLabel(text: string, maxChars = LABEL_MAX_CHARS): string[] {
  const words = text.split(/\s+/).filter((word) => word.length > 0);
  if (words.length === 0) {
    return [""];
  }
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if (current.length === 0) {
      current = word;
      continue;
    }
    if (`${current} ${word}`.length <= maxChars) {
      current = `${current} ${word}`;
      continue;
    }
    lines.push(current);
    current = word;
  }
  lines.push(current);
  return lines;
}

export function sequenceLifelineHeadHeight(
  element: Pick<LifelineElement, "name" | "classifierName" | "head" | "stereotype">,
): number {
  const lines = wrapSequenceLabel(sequenceLifelineCaption(element));
  const text = lines.length * 16;
  if (element.head === "actor") {
    return 56 + text;
  }
  const stereotype = element.stereotype !== undefined && element.stereotype.length > 0 ? 16 : 0;
  return 16 + stereotype + text;
}

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
      const lines = wrapSequenceLabel(sequenceLifelineCaption(element));
      const stereotype = element.stereotype ?? "";
      const longest = Math.max(
        ...lines.map((line) => line.length),
        stereotype.length > 0 ? stereotype.length + 2 : 0,
        1,
      );
      const minWidth = element.head === "actor" ? 72 : notation.minWidth ?? 180;
      return {
        width: Math.max(minWidth, longest * 8 + 32),
        height: sequenceLifelineHeadHeight(element),
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
      const lines = element.name.split("\n").flatMap((line) => wrapSequenceLabel(line));
      const longest = Math.max(8, ...lines.map((line) => line.length));
      return {
        width: Math.max(notation.minWidth ?? 120, longest * 7 + 24),
        height: Math.max(notation.minHeight ?? 36, lines.length * 16 + 16),
      };
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
    return 0; // Stable sort retains the declaration order when no positions exist.
  });

  return new Map(sorted.map((lifeline, index) => [lifeline.id, index]));
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
    const maxY = Math.max(...messageIds.map(id => {
      const message = model.relationships.find(r => r.id === id);
      return (messageYById.get(id) ?? 0) + (message?.sourceId === message?.targetId ? 48 : 28);
    }));

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

  const lifelineSpacing = Math.max(LIFELINE_SPACING,
    ...lifelines.map(l => measureSequenceNode(l).width + 64),
    ...model.relationships.map((relationship) =>
      Math.min((relationship.name?.length ?? 0) * 8 + 80, LIFELINE_SPACING),
    ),
  );
  lifelines.forEach((lifeline) => {
    const measured = measureSequenceNode(lifeline);
    const existing = nodes[lifeline.id];
    const index = lifelineOrder.get(lifeline.id) ?? 0;
    const defaultX = LIFELINE_START_X + index * lifelineSpacing;

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
  const headBottom = Math.max(
    HEAD_Y + 32,
    ...lifelines.map((lifeline) => HEAD_Y + sequenceLifelineHeadHeight(lifeline)),
  );
  let messageCursorY = Math.max(MESSAGE_Y_START, headBottom + 28);

  const placeMessage = (relationship: Extract<UmlModel["relationships"][number], { relationshipType: "message" }>) => {
    const y = messageCursorY;
    const selfCall = relationship.sourceId === relationship.targetId;
    const labelLines = relationship.name !== undefined ? wrapSequenceLabel(relationship.name, 32).length : 1;
    messageCursorY += MESSAGE_Y_SPACING + Math.max(0, labelLines - 1) * 14 + (selfCall ? 32 : 0);
    messageYById.set(relationship.id, y);
    maxMessageY = Math.max(maxMessageY, y + (selfCall ? 28 : 0));

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
  };

  const placeTimelineNote = (element: UmlElement) => {
    if (element.elementType !== "note") {
      return;
    }
    const measured = measureSequenceNode(element);
    const lifelineNodes = (element.noteLifelineIds ?? [])
      .map((id) => nodes[id])
      .filter((node): node is OverlayNode => node !== undefined);
    let x = LIFELINE_START_X;
    let width = measured.width;
    const placement = element.notePlacement ?? "over";
    if (lifelineNodes.length > 0) {
      const left = Math.min(...lifelineNodes.map((node) => node.x));
      const right = Math.max(...lifelineNodes.map((node) => node.x + node.width));
      const first = lifelineNodes[0];
      if (placement === "left") {
        x = left - measured.width - 16;
      } else if (placement === "right") {
        x = right + 16;
      } else if (lifelineNodes.length === 1 && first !== undefined) {
        x = first.x + first.width / 2 - measured.width / 2;
      } else {
        x = left;
        width = Math.max(measured.width, right - left);
      }
    }
    nodes[element.id] = {
      id: element.id,
      x,
      y: messageCursorY,
      width,
      height: measured.height,
    };
    maxMessageY = Math.max(maxMessageY, messageCursorY + measured.height);
    messageCursorY += measured.height + 16;
  };

  const indexedNotes = model.elements.filter(
    (element) => element.elementType === "note" && element.interactionIndex !== undefined,
  );
  if (indexedNotes.length === 0) {
    for (const relationship of model.relationships) {
      if (relationship.relationshipType !== "message") {
        continue;
      }
      placeMessage(relationship);
    }
  } else {
    type TimelineEvent =
      | { index: number; kind: "message"; relationship: Extract<UmlModel["relationships"][number], { relationshipType: "message" }> }
      | { index: number; kind: "note"; element: UmlElement };
    const events: TimelineEvent[] = [];
    let fallback = 0;
    for (const relationship of model.relationships) {
      if (relationship.relationshipType !== "message") {
        continue;
      }
      events.push({
        index: relationship.interactionIndex ?? fallback,
        kind: "message",
        relationship,
      });
      fallback += 1;
    }
    for (const note of indexedNotes) {
      if (note.interactionIndex === undefined) {
        continue;
      }
      events.push({ index: note.interactionIndex, kind: "note", element: note });
    }
    events.sort((left, right) => left.index - right.index);
    for (const event of events) {
      if (event.kind === "note") {
        placeTimelineNote(event.element);
        continue;
      }
      placeMessage(event.relationship);
    }
  }

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

  const fragmentNodes = encloseSequenceFrames(
    model,
    layoutCombinedFragments(model, { ...pruned, nodes, edges }, messageYById),
  );
  let contentBottom = maxMessageY;
  for (const node of Object.values(fragmentNodes)) {
    contentBottom = Math.max(contentBottom, node.y + node.height);
  }
  for (const lifeline of lifelines) {
    const node = fragmentNodes[lifeline.id];
    if (node === undefined) {
      continue;
    }
    fragmentNodes[lifeline.id] = {
      ...node,
      height: Math.max(node.height, contentBottom - node.y + LIFELINE_PADDING_BOTTOM),
    };
  }

  return {
    ...pruned,
    nodes: fragmentNodes,
    edges,
  };
}

function encloseSequenceFrames(
  model: UmlModel,
  nodes: Record<string, OverlayNode>,
): Record<string, OverlayNode> {
  const next = { ...nodes };
  const fragments = model.elements.filter(
    (element): element is CombinedFragmentElement => element.elementType === "combinedFragment",
  );
  const messageIdsOf = (fragment: CombinedFragmentElement) =>
    fragment.operands.flatMap((operand) => operand.messageIds);

  const grow = (id: string, box: OverlayNode, pad: number) => {
    const node = next[id];
    if (node === undefined) {
      return;
    }
    const x = Math.min(node.x, box.x - pad);
    const y = Math.min(node.y, box.y - pad);
    const right = Math.max(node.x + node.width, box.x + box.width + pad);
    const bottom = Math.max(node.y + node.height, box.y + box.height + pad);
    next[id] = { ...node, x, y, width: right - x, height: bottom - y };
  };

  for (const note of model.elements) {
    if (note.elementType !== "note" || note.noteHostFragmentId === undefined) {
      continue;
    }
    const box = next[note.id];
    if (box !== undefined) {
      grow(note.noteHostFragmentId, box, 12);
    }
  }

  const ordered = [...fragments].sort(
    (left, right) => messageIdsOf(left).length - messageIdsOf(right).length,
  );
  for (const inner of ordered) {
    const innerIds = messageIdsOf(inner);
    const innerNode = next[inner.id];
    if (innerIds.length === 0 || innerNode === undefined) {
      continue;
    }
    for (const outer of fragments) {
      if (outer.id === inner.id) {
        continue;
      }
      const outerIds = messageIdsOf(outer);
      if (outerIds.length <= innerIds.length) {
        continue;
      }
      if (!innerIds.every((id) => outerIds.includes(id))) {
        continue;
      }
      grow(outer.id, innerNode, 18);
    }
  }

  return next;
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
