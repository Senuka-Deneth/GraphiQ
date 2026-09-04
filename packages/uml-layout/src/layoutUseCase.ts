import { ACTOR, USE_CASE } from "@graphiq/uml-notation";
import type { UmlElement, UmlModel } from "@graphiq/uml-model";
import type { ElkGraphInput } from "./elk.js";
import { layoutWithElk } from "./elk.js";
import type { LayoutMode, NotationOverlay, OverlayEdge, OverlayNode } from "./overlay.js";

const SUBJECT_PADDING = 24;
const SUBJECT_HEADER_HEIGHT = 32;
const SUBJECT_MIN_WIDTH = 320;
const SUBJECT_MIN_HEIGHT = 240;
const ACTOR_NAME_HEIGHT = 20;
const ACTOR_COLUMN_GAP = 48;
const ACTOR_SUBJECT_GAP = 64;
const USE_CASE_GRID_GAP = 16;

function isLayoutElement(element: UmlElement): boolean {
  return (
    element.elementType === "actor" ||
    element.elementType === "useCase" ||
    element.elementType === "subject" ||
    element.elementType === "note"
  );
}

export function measureUseCaseNode(element: UmlElement): Pick<OverlayNode, "width" | "height"> {
  switch (element.elementType) {
    case "actor":
      return { width: 80, height: ACTOR.height + ACTOR_NAME_HEIGHT };
    case "useCase":
      return { width: USE_CASE.minWidth, height: USE_CASE.minHeight };
    case "subject":
      return { width: SUBJECT_MIN_WIDTH, height: SUBJECT_MIN_HEIGHT };
    case "note":
      return { width: 120, height: 60 };
    default:
      return { width: USE_CASE.minWidth, height: USE_CASE.minHeight };
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

function packUseCasesInGrid(
  useCaseIds: readonly string[],
  measured: Map<string, Pick<OverlayNode, "width" | "height">>,
): { positions: Map<string, { x: number; y: number }>; width: number; height: number } {
  const columns = Math.max(1, Math.ceil(Math.sqrt(useCaseIds.length)));
  const positions = new Map<string, { x: number; y: number }>();
  let maxRowHeight = 0;
  let maxColWidth = 0;

  for (let index = 0; index < useCaseIds.length; index += 1) {
    const id = useCaseIds[index];
    if (id === undefined) {
      continue;
    }
    const size = measured.get(id) ?? { width: USE_CASE.minWidth, height: USE_CASE.minHeight };
    maxColWidth = Math.max(maxColWidth, size.width);
    maxRowHeight = Math.max(maxRowHeight, size.height);
  }

  let gridWidth = 0;
  let gridHeight = 0;

  for (let index = 0; index < useCaseIds.length; index += 1) {
    const id = useCaseIds[index];
    if (id === undefined) {
      continue;
    }
    const row = Math.floor(index / columns);
    const col = index % columns;
    const x = SUBJECT_PADDING + col * (maxColWidth + USE_CASE_GRID_GAP);
    const y = SUBJECT_HEADER_HEIGHT + SUBJECT_PADDING + row * (maxRowHeight + USE_CASE_GRID_GAP);
    positions.set(id, { x, y });
    gridWidth = Math.max(gridWidth, x + maxColWidth + SUBJECT_PADDING);
    gridHeight = Math.max(gridHeight, y + maxRowHeight + SUBJECT_PADDING);
  }

  return {
    positions,
    width: Math.max(SUBJECT_MIN_WIDTH, gridWidth),
    height: Math.max(SUBJECT_MIN_HEIGHT, gridHeight),
  };
}

function layoutWithCustomPacker(
  model: UmlModel,
  overlay: NotationOverlay,
  mode: LayoutMode,
): NotationOverlay {
  const nodes = { ...overlay.nodes };
  const layoutIds: string[] = [];

  const subjects = model.elements.filter(
    (element) => element.elementType === "subject" && element.parentId === undefined,
  );
  const actors = model.elements.filter(
    (element) => element.elementType === "actor" && element.parentId === undefined,
  );
  const orphanUseCases = model.elements.filter(
    (element) => element.elementType === "useCase" && element.parentId === undefined,
  );

  let subjectRightEdge = 0;
  let subjectTop = 0;

  for (const subject of subjects) {
    const existing = overlay.nodes[subject.id];
    const shouldPreserve = mode === "incremental" && hasFinitePosition(existing);

    const childUseCases = model.elements.filter(
      (element) => element.elementType === "useCase" && element.parentId === subject.id,
    );
    const measured = new Map(
      childUseCases.map((element) => [element.id, measureUseCaseNode(element)]),
    );
    const packed = packUseCasesInGrid(
      childUseCases.map((element) => element.id),
      measured,
    );

    if (!shouldPreserve) {
      layoutIds.push(subject.id);
      const subjectX = Math.max(ACTOR_SUBJECT_GAP + 160, subjectRightEdge + ACTOR_SUBJECT_GAP);
      nodes[subject.id] = {
        id: subject.id,
        x: subjectX,
        y: subjectTop,
        width: packed.width,
        height: packed.height,
      };
      subjectRightEdge = subjectX + packed.width;
    } else {
      subjectRightEdge = Math.max(subjectRightEdge, existing.x + existing.width);
    }

    const subjectNode = nodes[subject.id];
    if (subjectNode === undefined) {
      continue;
    }

    for (const child of childUseCases) {
      const childExisting = overlay.nodes[child.id];
      const preserveChild = mode === "incremental" && hasFinitePosition(childExisting);
      if (preserveChild) {
        continue;
      }

      layoutIds.push(child.id);
      const position = packed.positions.get(child.id);
      const size = measured.get(child.id) ?? measureUseCaseNode(child);
      nodes[child.id] = {
        id: child.id,
        x: position?.x ?? SUBJECT_PADDING,
        y: position?.y ?? SUBJECT_HEADER_HEIGHT + SUBJECT_PADDING,
        width: size.width,
        height: size.height,
      };
    }
  }

  let actorY = subjectTop;
  for (const actor of actors) {
    const existing = overlay.nodes[actor.id];
    const shouldPreserve = mode === "incremental" && hasFinitePosition(existing);
    if (shouldPreserve) {
      actorY = Math.max(actorY, existing.y + existing.height + ACTOR_COLUMN_GAP);
      continue;
    }

    layoutIds.push(actor.id);
    const measured = measureUseCaseNode(actor);
    nodes[actor.id] = {
      id: actor.id,
      x: 0,
      y: actorY,
      width: measured.width,
      height: measured.height,
    };
    actorY += measured.height + ACTOR_COLUMN_GAP;
  }

  let orphanX = subjectRightEdge + ACTOR_SUBJECT_GAP;
  let orphanY = 0;
  for (const useCase of orphanUseCases) {
    const existing = overlay.nodes[useCase.id];
    const shouldPreserve = mode === "incremental" && hasFinitePosition(existing);
    if (shouldPreserve) {
      continue;
    }

    layoutIds.push(useCase.id);
    const measured = measureUseCaseNode(useCase);
    nodes[useCase.id] = {
      id: useCase.id,
      x: orphanX,
      y: orphanY,
      width: measured.width,
      height: measured.height,
    };
    orphanY += measured.height + USE_CASE_GRID_GAP;
  }

  for (const element of model.elements) {
    if (element.elementType !== "note") {
      continue;
    }
    const existing = overlay.nodes[element.id];
    const shouldPreserve = mode === "incremental" && hasFinitePosition(existing);
    if (shouldPreserve || nodes[element.id] !== undefined) {
      continue;
    }
    layoutIds.push(element.id);
    const measured = measureUseCaseNode(element);
    nodes[element.id] = {
      id: element.id,
      x: orphanX,
      y: orphanY,
      width: measured.width,
      height: measured.height,
    };
    orphanY += measured.height + USE_CASE_GRID_GAP;
  }

  return {
    ...overlay,
    nodes,
  };
}

async function layoutWithElkFallback(
  model: UmlModel,
  overlay: NotationOverlay,
  mode: LayoutMode,
): Promise<NotationOverlay> {
  const layoutElements = model.elements.filter(isLayoutElement);
  const layoutIds: string[] = [];

  const children: ElkGraphInput[] = layoutElements.map((element) => {
    const measured = measureUseCaseNode(element);
    const existing = overlay.nodes[element.id];
    const shouldPreserve = mode === "incremental" && hasFinitePosition(existing);

    if (!shouldPreserve) {
      layoutIds.push(element.id);
    }

    return {
      id: element.id,
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
    };
  });

  const edges = model.relationships.map((relationship) => ({
    id: relationship.id,
    sources: [relationship.sourceId],
    targets: [relationship.targetId],
  }));

  const graph: ElkGraphInput = {
    id: "root",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": "RIGHT",
      "elk.edgeRouting": "ORTHOGONAL",
      "elk.spacing.nodeNode": "48",
    },
    children,
    edges,
  };

  if (layoutIds.length === 0) {
    return overlay;
  }

  const result = await layoutWithElk(graph);
  const nodes = { ...overlay.nodes };
  const layoutIdSet = new Set(layoutIds);

  for (const child of result.children ?? []) {
    if (!layoutIdSet.has(child.id)) {
      continue;
    }
    if (
      child.x === undefined ||
      child.y === undefined ||
      child.width === undefined ||
      child.height === undefined
    ) {
      continue;
    }

    nodes[child.id] = {
      id: child.id,
      x: child.x,
      y: child.y,
      width: child.width,
      height: child.height,
    };
  }

  return {
    ...overlay,
    nodes,
  };
}

export async function layoutUseCase(
  model: UmlModel,
  overlay: NotationOverlay,
  mode: LayoutMode,
): Promise<NotationOverlay> {
  const pruned = pruneOverlay(model, overlay);

  const hasSubject = model.elements.some((element) => element.elementType === "subject");
  if (hasSubject) {
    return layoutWithCustomPacker(model, pruned, mode);
  }

  return layoutWithElkFallback(model, pruned, mode);
}
