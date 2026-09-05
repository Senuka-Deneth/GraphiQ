import { CLASS_BOX } from "@graphiq/uml-notation";
import { isTransitionRelationship, type UmlElement, type UmlModel } from "@graphiq/uml-model";
import type { ElkGraphInput, ElkGraphOutput } from "./elk.js";
import { layoutWithElk } from "./elk.js";
import type { LayoutMode, NotationOverlay, OverlayEdge, OverlayNode } from "./overlay.js";

const STATE_PADDING = 16;
const REGION_PADDING = 12;
const FORK_JOIN_HEIGHT = 8;
const FORK_JOIN_MIN_WIDTH = 80;
const NAME_ROW = 32;
const ACTIVITY_ROW = 20;

const LAYOUT_VERTEX_TYPES = new Set<UmlElement["elementType"]>([
  "state",
  "pseudostate",
  "finalState",
  "note",
]);

function isLayoutVertex(element: UmlElement): boolean {
  return LAYOUT_VERTEX_TYPES.has(element.elementType);
}

export function measureStateMachineNode(
  element: UmlElement,
): Pick<OverlayNode, "width" | "height"> {
  switch (element.elementType) {
    case "state": {
      let rows = 1;
      if (element.entry !== undefined) {
        rows += 1;
      }
      if (element.do !== undefined) {
        rows += 1;
      }
      if (element.exit !== undefined) {
        rows += 1;
      }
      return {
        width: Math.max(140, element.name.length * 8 + 32),
        height: NAME_ROW + (rows - 1) * ACTIVITY_ROW + 16,
      };
    }
    case "pseudostate":
      if (element.kind === "fork" || element.kind === "join") {
        return { width: FORK_JOIN_MIN_WIDTH, height: FORK_JOIN_HEIGHT };
      }
      if (element.kind === "choice" || element.kind === "junction") {
        return { width: 36, height: 36 };
      }
      if (element.kind === "terminate") {
        return { width: 24, height: 24 };
      }
      return { width: 20, height: 20 };
    case "finalState":
      return { width: 24, height: 24 };
    case "region":
      return { width: 180, height: 120 };
    case "note":
      return { width: 120, height: 60 };
    default:
      return { width: CLASS_BOX.minWidth, height: CLASS_BOX.minHeight };
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

function descendantsInScope(model: UmlModel, rootId: string): Set<string> {
  const ids = new Set<string>([rootId]);
  const queue = [rootId];

  while (queue.length > 0) {
    const current = queue.shift();
    if (current === undefined) {
      continue;
    }
    for (const child of model.elements.filter((element) => element.parentId === current)) {
      ids.add(child.id);
      if (child.elementType === "region" || child.elementType === "state") {
        queue.push(child.id);
      }
    }
  }

  return ids;
}

function transitionsInScope(model: UmlModel, scopeIds: ReadonlySet<string>) {
  return model.relationships.filter(
    (relationship) =>
      isTransitionRelationship(relationship) &&
      scopeIds.has(relationship.sourceId) &&
      scopeIds.has(relationship.targetId),
  );
}

function layeredOptions(direction: "DOWN" | "RIGHT" = "DOWN"): Record<string, string> {
  return {
    "elk.algorithm": "layered",
    "elk.direction": direction,
    "elk.edgeRouting": "ORTHOGONAL",
    "elk.spacing.nodeNode": "48",
    "elk.layered.spacing.nodeNodeBetweenLayers": "64",
  };
}

function buildLeafElkNode(
  element: UmlElement,
  overlay: NotationOverlay,
  mode: LayoutMode,
  layoutIds: string[],
): ElkGraphInput {
  const measured = measureStateMachineNode(element);
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
}

function buildRegionElkNode(
  model: UmlModel,
  region: UmlElement,
  overlay: NotationOverlay,
  mode: LayoutMode,
  layoutIds: string[],
): ElkGraphInput {
  const scopeIds = descendantsInScope(model, region.id);
  const vertices = model.elements.filter(
    (element) => scopeIds.has(element.id) && isLayoutVertex(element),
  );
  const childNodes = vertices.map((vertex) =>
    buildLayoutElkNode(model, vertex, overlay, mode, layoutIds),
  );
  const edges = transitionsInScope(model, scopeIds).map((relationship) => ({
    id: relationship.id,
    sources: [relationship.sourceId],
    targets: [relationship.targetId],
  }));

  const existing = overlay.nodes[region.id];
  const shouldPreserve = mode === "incremental" && hasFinitePosition(existing);

  if (!shouldPreserve) {
    layoutIds.push(region.id);
  }

  return {
    id: region.id,
    layoutOptions: {
      ...layeredOptions("DOWN"),
      "elk.padding": `[top=${REGION_PADDING},left=${REGION_PADDING},bottom=${REGION_PADDING},right=${REGION_PADDING}]`,
    },
    children: childNodes,
    edges,
    ...(shouldPreserve
      ? {
          x: existing.x,
          y: existing.y,
          width: existing.width,
          height: existing.height,
          layoutOptions: {
            ...layeredOptions("DOWN"),
            "elk.fixed": "true",
          },
        }
      : {
          width: measureStateMachineNode(region).width,
          height: measureStateMachineNode(region).height,
        }),
  };
}

function buildLayoutElkNode(
  model: UmlModel,
  element: UmlElement,
  overlay: NotationOverlay,
  mode: LayoutMode,
  layoutIds: string[],
): ElkGraphInput {
  if (element.elementType === "state") {
    const regions = model.elements.filter(
      (child) => child.parentId === element.id && child.elementType === "region",
    );
    if (regions.length > 0) {
      const existing = overlay.nodes[element.id];
      const shouldPreserve = mode === "incremental" && hasFinitePosition(existing);
      const regionNodes = regions.map((region) =>
        buildRegionElkNode(model, region, overlay, mode, layoutIds),
      );

      if (!shouldPreserve) {
        layoutIds.push(element.id);
      }

      return {
        id: element.id,
        layoutOptions: {
          "elk.algorithm": "box",
          "elk.padding": `[top=${NAME_ROW + STATE_PADDING},left=${STATE_PADDING},bottom=${STATE_PADDING},right=${STATE_PADDING}]`,
          "elk.spacing.nodeNode": "16",
        },
        children: regionNodes,
        ...(shouldPreserve
          ? {
              x: existing.x,
              y: existing.y,
              width: existing.width,
              height: existing.height,
              layoutOptions: {
                "elk.algorithm": "box",
                "elk.fixed": "true",
              },
            }
          : {
              width: Math.max(180, measureStateMachineNode(element).width),
              height: Math.max(120, measureStateMachineNode(element).height),
            }),
      };
    }
  }

  return buildLeafElkNode(element, overlay, mode, layoutIds);
}

function buildElkGraph(
  model: UmlModel,
  overlay: NotationOverlay,
  mode: LayoutMode,
): { graph: ElkGraphInput; layoutIds: string[] } {
  const roots = model.elements.filter(
    (element) => element.parentId === undefined && isLayoutVertex(element),
  );
  const layoutIds: string[] = [];
  const children = roots.map((element) =>
    buildLayoutElkNode(model, element, overlay, mode, layoutIds),
  );

  const topLevelIds = new Set(roots.map((element) => element.id));
  const edges = transitionsInScope(model, topLevelIds).map((relationship) => ({
    id: relationship.id,
    sources: [relationship.sourceId],
    targets: [relationship.targetId],
  }));

  return {
    graph: {
      id: "root",
      layoutOptions: layeredOptions("DOWN"),
      children,
      edges,
    },
    layoutIds,
  };
}

function flattenElkChildren(
  node: ElkGraphOutput,
  nodes: Record<string, OverlayNode>,
  layoutIds: ReadonlySet<string>,
): void {
  if (
    layoutIds.has(node.id) &&
    node.x !== undefined &&
    node.y !== undefined &&
    node.width !== undefined &&
    node.height !== undefined
  ) {
    nodes[node.id] = {
      id: node.id,
      x: node.x,
      y: node.y,
      width: node.width,
      height: node.height,
    };
  }

  for (const child of node.children ?? []) {
    flattenElkChildren(child, nodes, layoutIds);
  }
}

function applyElkResult(
  overlay: NotationOverlay,
  result: ElkGraphOutput,
  layoutIds: readonly string[],
): NotationOverlay {
  const layoutIdSet = new Set(layoutIds);
  const nodes = { ...overlay.nodes };

  for (const child of result.children ?? []) {
    flattenElkChildren(child, nodes, layoutIdSet);
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

export async function layoutStateMachine(
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

export function createStateMachineFixtureModel(): UmlModel {
  return {
    id: "state-machine-fixture",
    kind: "stateMachine",
    elements: [
      { id: "initial", elementType: "pseudostate", name: "[*]", kind: "initial" },
      { id: "state-draft", elementType: "state", name: "Draft" },
      { id: "state-paid", elementType: "state", name: "Paid" },
      { id: "final", elementType: "finalState", name: "[*]" },
    ],
    relationships: [
      {
        id: "t-1",
        relationshipType: "transition",
        sourceId: "initial",
        targetId: "state-draft",
      },
      {
        id: "t-2",
        relationshipType: "transition",
        sourceId: "state-draft",
        targetId: "state-paid",
        trigger: "pay",
        guard: "amount > 0",
        effect: "emitReceipt",
      },
      {
        id: "t-3",
        relationshipType: "transition",
        sourceId: "state-paid",
        targetId: "final",
      },
    ],
  };
}
