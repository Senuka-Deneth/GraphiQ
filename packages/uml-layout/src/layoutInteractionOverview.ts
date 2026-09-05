import { getElementNotation } from "@graphiq/uml-notation";
import type { UmlElement, UmlModel } from "@graphiq/uml-model";
import type { ElkGraphInput, ElkGraphOutput } from "./elk.js";
import { layoutWithElk } from "./elk.js";
import type { LayoutMode, NotationOverlay, OverlayEdge, OverlayNode } from "./overlay.js";

const FORK_JOIN_HEIGHT = 8;
const FORK_JOIN_MIN_WIDTH = 80;

const LAYOUT_ELEMENT_TYPES = new Set<UmlElement["elementType"]>([
  "interactionUse",
  "initialNode",
  "activityFinalNode",
  "decisionNode",
  "mergeNode",
  "forkNode",
  "joinNode",
  "note",
]);

function isLayoutElement(element: UmlElement): boolean {
  return LAYOUT_ELEMENT_TYPES.has(element.elementType);
}

export function measureInteractionOverviewNode(
  element: UmlElement,
): Pick<OverlayNode, "width" | "height"> {
  switch (element.elementType) {
    case "interactionUse": {
      const notation = getElementNotation("interactionUse");
      return {
        width: notation.minWidth ?? 160,
        height: notation.minHeight ?? 80,
      };
    }
    case "initialNode":
      return { width: 20, height: 20 };
    case "activityFinalNode":
      return { width: 24, height: 24 };
    case "decisionNode":
    case "mergeNode":
      return { width: 36, height: 36 };
    case "forkNode":
    case "joinNode":
      return { width: FORK_JOIN_MIN_WIDTH, height: FORK_JOIN_HEIGHT };
    case "note": {
      const notation = getElementNotation("note");
      return { width: notation.minWidth ?? 120, height: notation.minHeight ?? 60 };
    }
    default:
      return { width: 160, height: 80 };
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

function buildElkGraph(
  model: UmlModel,
  overlay: NotationOverlay,
  mode: LayoutMode,
): { graph: ElkGraphInput; layoutIds: string[] } {
  const layoutElements = model.elements.filter(isLayoutElement);
  const layoutIds: string[] = [];

  const children: ElkGraphInput[] = layoutElements.map((element) => {
    const measured = measureInteractionOverviewNode(element);
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

  const edges = model.relationships
    .filter((relationship) => relationship.relationshipType === "controlFlow")
    .map((relationship) => ({
      id: relationship.id,
      sources: [relationship.sourceId],
      targets: [relationship.targetId],
    }));

  return {
    graph: {
      id: "root",
      layoutOptions: {
        "elk.algorithm": "layered",
        "elk.direction": "DOWN",
        "elk.edgeRouting": "ORTHOGONAL",
        "elk.spacing.nodeNode": "48",
        "elk.layered.spacing.nodeNodeBetweenLayers": "64",
      },
      children,
      edges,
    },
    layoutIds,
  };
}

function applyElkResult(
  overlay: NotationOverlay,
  result: ElkGraphOutput,
  layoutIds: readonly string[],
): NotationOverlay {
  const layoutIdSet = new Set(layoutIds);
  const nodes = { ...overlay.nodes };

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

  const edges = { ...overlay.edges };
  for (const edge of result.edges ?? []) {
    const sections = edge.sections;
    if (sections === undefined || sections.length === 0) {
      continue;
    }

    const waypoints: { x: number; y: number }[] = [];
    for (const section of sections) {
      waypoints.push(section.startPoint);
      for (const bendPoint of section.bendPoints ?? []) {
        waypoints.push(bendPoint);
      }
      waypoints.push(section.endPoint);
    }

    edges[edge.id] = {
      id: edge.id,
      waypoints,
    };
  }

  return {
    ...overlay,
    nodes,
    edges,
  };
}

export async function layoutInteractionOverview(
  model: UmlModel,
  overlay: NotationOverlay,
  mode: LayoutMode,
): Promise<NotationOverlay> {
  const pruned = pruneOverlay(model, overlay);
  const { graph, layoutIds } = buildElkGraph(model, pruned, mode);

  if (layoutIds.length === 0 && (graph.children?.length ?? 0) > 0) {
    return pruned;
  }

  const result = await layoutWithElk(graph);
  return applyElkResult(pruned, result, layoutIds);
}

export function createInteractionOverviewFixtureModel(): UmlModel {
  return {
    id: "fixture-model",
    kind: "interactionOverview",
    elements: [
      { id: "initial", elementType: "initialNode", name: "initial" },
      { id: "ref-checkout", elementType: "interactionUse", name: "Checkout" },
      { id: "ref-fulfill", elementType: "interactionUse", name: "Fulfill" },
      { id: "final", elementType: "activityFinalNode", name: "final" },
    ],
    relationships: [
      {
        id: "flow-1",
        relationshipType: "controlFlow",
        sourceId: "initial",
        targetId: "ref-checkout",
      },
      {
        id: "flow-2",
        relationshipType: "controlFlow",
        sourceId: "ref-checkout",
        targetId: "ref-fulfill",
      },
      {
        id: "flow-3",
        relationshipType: "controlFlow",
        sourceId: "ref-fulfill",
        targetId: "final",
      },
    ],
  };
}
