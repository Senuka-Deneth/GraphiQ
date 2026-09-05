export const GRID_GAP = 20;
export const SNAP_GRID: [number, number] = [8, 8];
export const DEFAULT_ZOOM = 1;
export const MIN_ZOOM = 0.15;
export const MAX_ZOOM = 4;
export const DEFAULT_STROKE_WIDTH = 2;
export const GRID_COLOR = "#cbd5e1";
export const DEFAULT_EDGE_COLOR = "#0f172a";

export const DEFAULT_VIEWPORT = {
  x: 0,
  y: 0,
  zoom: DEFAULT_ZOOM,
} as const;

export const FLOW_CANVAS_DEFAULTS = {
  snapToGrid: true,
  snapGrid: SNAP_GRID,
  minZoom: MIN_ZOOM,
  maxZoom: MAX_ZOOM,
  deleteKeyCode: ["Backspace", "Delete"] as string[],
  proOptions: { hideAttribution: true },
};
