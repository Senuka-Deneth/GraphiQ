export type OverlayNode = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type OverlayEdge = {
  id: string;
  waypoints?: { x: number; y: number }[];
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
