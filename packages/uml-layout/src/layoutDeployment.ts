import { CLASS_BOX } from "@graphiq/uml-notation";
import type { UmlElement, UmlModel } from "@graphiq/uml-model";
import type { ElkGraphInput, ElkGraphOutput } from "./elk.js";
import { layoutWithElk } from "./elk.js";
import type { LayoutMode, NotationOverlay, OverlayEdge, OverlayNode } from "./overlay.js";

const NODE_PADDING = 24;
const NODE_HEADER_HEIGHT = 36;

function isNodeish(element: UmlElement): boolean {
  return (
    element.elementType === "node" ||
    element.elementType === "device" ||
    element.elementType === "executionEnvironment"
  );
}

function isLayoutElement(element: UmlElement): boolean {
  return (
    isNodeish(element) ||
    element.elementType === "artifact" ||
    element.elementType === "deploymentSpecification" ||
    element.elementType === "note"
  );
}

export function measureDeploymentNode(element: UmlElement): Pick<OverlayNode, "width" | "height"> {
  if (isNodeish(element)) {
    return { width: 240, height: 160 };
  }

  if (element.elementType === "note") {
    return { width: 120, height: 60 };
  }

  return {
    width: CLASS_BOX.minWidth,
    height: CLASS_BOX.minHeight,
  };
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
  const measured = measureDeploymentNode(element);
  const existing = overlay.nodes[element.id];
  const shouldPreserve = mode === "incremental" && hasFinitePosition(existing);
  const children = model.elements.filter((item) => item.parentId === element.id);

  if (isNodeish(element) && children.length > 0) {
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
        "elk.padding": `[top=${NODE_HEADER_HEIGHT},left=${NODE_PADDING},bottom=${NODE_PADDING},right=${NODE_PADDING}]`,
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

  const edges = model.relationships.map((relationship) => ({
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

export async function layoutDeployment(
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
