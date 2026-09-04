import { CLASS_BOX } from "@graphiq/uml-notation";
import type { UmlElement, UmlModel } from "@graphiq/uml-model";
import type { ElkGraphInput, ElkGraphOutput } from "./elk.js";
import { layoutWithElk } from "./elk.js";
import type { LayoutMode, NotationOverlay, OverlayEdge, OverlayNode } from "./overlay.js";

const FRAME_PADDING = 24;
const FRAME_HEADER_HEIGHT = 32;
const PORT_SIZE = 16;
const PART_MIN_WIDTH = 120;
const PART_MIN_HEIGHT = 56;

function isLayoutElement(element: UmlElement): boolean {
  return (
    element.elementType === "class" ||
    element.elementType === "component" ||
    element.elementType === "part" ||
    element.elementType === "port" ||
    element.elementType === "note"
  );
}

export function measureCompositeStructureNode(
  element: UmlElement,
): Pick<OverlayNode, "width" | "height"> {
  switch (element.elementType) {
    case "class":
    case "component":
      return { width: 280, height: 200 };
    case "part":
      return { width: PART_MIN_WIDTH, height: PART_MIN_HEIGHT };
    case "port":
      return { width: PORT_SIZE, height: PORT_SIZE };
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

function buildElkNode(
  model: UmlModel,
  element: UmlElement,
  overlay: NotationOverlay,
  mode: LayoutMode,
  layoutIds: string[],
): ElkGraphInput {
  const measured = measureCompositeStructureNode(element);
  const existing = overlay.nodes[element.id];
  const shouldPreserve = mode === "incremental" && hasFinitePosition(existing);
  const children = model.elements.filter(
    (item) => item.parentId === element.id && item.elementType === "part",
  );

  if (
    (element.elementType === "class" || element.elementType === "component") &&
    children.length > 0
  ) {
    const childNodes = children.map((child) =>
      buildElkNode(model, child, overlay, mode, layoutIds),
    );

    if (!shouldPreserve) {
      layoutIds.push(element.id);
      for (const child of children) {
        if (!(mode === "incremental" && hasFinitePosition(overlay.nodes[child.id]))) {
          layoutIds.push(child.id);
        }
      }
    }

    return {
      id: element.id,
      layoutOptions: {
        "elk.algorithm": "box",
        "elk.padding": `[top=${FRAME_HEADER_HEIGHT},left=${FRAME_PADDING},bottom=${FRAME_PADDING},right=${FRAME_PADDING}]`,
        "elk.spacing.nodeNode": "24",
      },
      children: childNodes,
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
            width: measured.width,
            height: measured.height,
          }),
    };
  }

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

function buildElkGraph(
  model: UmlModel,
  overlay: NotationOverlay,
  mode: LayoutMode,
): { graph: ElkGraphInput; layoutIds: string[] } {
  const roots = model.elements.filter(
    (element) => isLayoutElement(element) && element.parentId === undefined,
  );
  const layoutIds: string[] = [];
  const children = roots.map((element) => buildElkNode(model, element, overlay, mode, layoutIds));

  const edges = model.relationships.flatMap((relationship) => {
    const source = model.elements.find((element) => element.id === relationship.sourceId);
    const target = model.elements.find((element) => element.id === relationship.targetId);
    if (source === undefined || target === undefined) {
      return [];
    }

    if (source.elementType === "port" || target.elementType === "port") {
      return [];
    }

    return [
      {
        id: relationship.id,
        sources: [relationship.sourceId],
        targets: [relationship.targetId],
      },
    ];
  });

  return {
    graph: {
      id: "root",
      layoutOptions: {
        "elk.algorithm": "layered",
        "elk.direction": "RIGHT",
        "elk.edgeRouting": "ORTHOGONAL",
        "elk.spacing.nodeNode": "64",
        "elk.layered.spacing.nodeNodeBetweenLayers": "80",
      },
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

function placePortsOnBorder(
  model: UmlModel,
  nodes: Record<string, OverlayNode>,
  layoutIds: ReadonlySet<string>,
): void {
  const parentsWithPorts = new Map<string, UmlElement[]>();

  for (const element of model.elements) {
    if (element.elementType !== "port" || element.parentId === undefined) {
      continue;
    }
    const ports = parentsWithPorts.get(element.parentId) ?? [];
    ports.push(element);
    parentsWithPorts.set(element.parentId, ports);
  }

  for (const [parentId, ports] of parentsWithPorts) {
    const parentNode = nodes[parentId];
    if (parentNode === undefined) {
      continue;
    }

    const sortedPorts = [...ports].sort((left, right) => left.name.localeCompare(right.name));
    const spacing = Math.max(
      PORT_SIZE + 8,
      (parentNode.height - FRAME_PADDING) / Math.max(sortedPorts.length + 1, 2),
    );

    sortedPorts.forEach((port, index) => {
      if (layoutIds.has(port.id) === false && hasFinitePosition(nodes[port.id])) {
        return;
      }

      const parentElement = model.elements.find((element) => element.id === parentId);
      const onLeft = parentElement?.elementType === "part" || index % 2 === 0;
      const y = FRAME_HEADER_HEIGHT + spacing * (index + 1) - PORT_SIZE / 2;

      nodes[port.id] = {
        id: port.id,
        x: onLeft ? -PORT_SIZE / 2 : parentNode.width - PORT_SIZE / 2,
        y: Math.max(FRAME_HEADER_HEIGHT, Math.min(y, parentNode.height - PORT_SIZE)),
        width: PORT_SIZE,
        height: PORT_SIZE,
      };
    });
  }
}

export async function layoutCompositeStructure(
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
  const withElk = applyElkResult(pruned, result, layoutIds);
  const nodes = { ...withElk.nodes };
  placePortsOnBorder(model, nodes, new Set(layoutIds));

  return {
    ...withElk,
    nodes,
  };
}
