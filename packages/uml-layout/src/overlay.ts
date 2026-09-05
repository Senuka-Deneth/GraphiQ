export type OverlayNode = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type EdgeRouteStyle = "orthogonal" | "straight" | "bezier";

export type OverlayEdge = {
  id: string;
  waypoints?: { x: number; y: number }[];
  routeStyle?: EdgeRouteStyle;
  strokeColor?: string;
  strokeWidth?: number;
};

export type NotationOverlay = {
  nodes: Record<string, OverlayNode>;
  edges: Record<string, OverlayEdge>;
  viewport?: { x: number; y: number; zoom: number };
};

export type RelayoutReason =
  | "topology-changed"
  | "user-auto-layout"
  | "first-open-empty-overlay";

export type LayoutMode = "full" | "incremental";

export function emptyOverlay(): NotationOverlay {
  return {
    nodes: {},
    edges: {},
  };
}

export function reasonToLayoutMode(reason: RelayoutReason): LayoutMode {
  switch (reason) {
    case "topology-changed":
      return "incremental";
    case "user-auto-layout":
    case "first-open-empty-overlay":
      return "full";
    default: {
      const unreachable: never = reason;
      throw new Error(`Unhandled relayout reason: ${String(unreachable)}`);
    }
  }
}

export function mergeOverlayEdgePresentation(
  previous: NotationOverlay,
  next: NotationOverlay,
): NotationOverlay {
  const edges: Record<string, OverlayEdge> = {};
  for (const [id, edge] of Object.entries(next.edges)) {
    const prior = previous.edges[id];
    edges[id] = {
      ...prior,
      ...edge,
      routeStyle: prior?.routeStyle ?? edge.routeStyle,
      strokeColor: prior?.strokeColor ?? edge.strokeColor,
      strokeWidth: prior?.strokeWidth ?? edge.strokeWidth,
    };
  }

  return {
    ...next,
    edges,
  };
}
