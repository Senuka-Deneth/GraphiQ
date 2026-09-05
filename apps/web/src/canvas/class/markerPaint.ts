import { DEFAULT_EDGE_COLOR } from "../canvasDefaults.js";

export function markerDomId(markerId: string, color: string): string {
  if (color === DEFAULT_EDGE_COLOR) {
    return markerId;
  }
  const suffix = color.replaceAll("#", "").replaceAll(/[^a-zA-Z0-9_-]/g, "");
  if (suffix.length === 0) {
    return markerId;
  }
  return `${markerId}__${suffix}`;
}

export function paintedMarkerUrl(markerId: string | null, color: string): string | undefined {
  if (markerId === null) {
    return undefined;
  }
  return `url(#${markerDomId(markerId, color)})`;
}

export function resolveMarkerFill(fill: "none" | "currentColor", color: string): string {
  switch (fill) {
    case "none":
      return "none";
    case "currentColor":
      return color;
    default: {
      const unreachable: never = fill;
      return unreachable;
    }
  }
}

export function resolveMarkerStroke(_stroke: "currentColor", color: string): string {
  return color;
}

export function extraStrokeColors(
  colors: readonly (string | undefined)[],
): string[] {
  const unique: string[] = [];
  const seen = new Set<string>();
  for (const color of colors) {
    if (color === undefined || color === DEFAULT_EDGE_COLOR || seen.has(color)) {
      continue;
    }
    seen.add(color);
    unique.push(color);
  }
  return unique;
}
