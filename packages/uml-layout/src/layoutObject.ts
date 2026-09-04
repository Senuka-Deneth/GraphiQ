import { CLASS_BOX } from "@graphiq/uml-notation";
import type { UmlElement, UmlModel } from "@graphiq/uml-model";
import type { ElkGraphInput, ElkGraphOutput } from "./elk.js";
import { layoutWithElk } from "./elk.js";
import type { LayoutMode, NotationOverlay, OverlayEdge, OverlayNode } from "./overlay.js";

function isLayoutElement(element: UmlElement): boolean {
  return element.elementType === "instanceSpecification" || element.elementType === "note";
}

export function measureObjectNode(element: UmlElement): Pick<OverlayNode, "width" | "height"> {
  if (element.elementType === "note") {
    return { width: 120, height: 60 };
  }

  if (element.elementType === "instanceSpecification") {
    const slotRows = element.slots.length;
    const height = Math.max(
      CLASS_BOX.minHeight,
      CLASS_BOX.nameCompartmentHeight + slotRows * CLASS_BOX.rowHeight,
    );

    return {
      width: CLASS_BOX.minWidth,
      height,
    };
  }

  throw new Error(`Unsupported object layout element: ${element.elementType}`);
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
    const measured = measureObjectNode(element);
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

  return {
    graph: {
      id: "root",
      layoutOptions: {
        "elk.algorithm": "layered",
        "elk.direction": "RIGHT",
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

export async function layoutObject(
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
