import { assertNever } from "@graphiq/uml-core";
import type { MarkerId, SvgMarkerDef } from "./types.js";

export const MARKER_IDS = [
  "gen-hollow-triangle",
  "realize-hollow-triangle",
  "assoc-open",
  "agg-hollow-diamond",
  "comp-filled-diamond",
  "dep-open",
  "ext-filled-triangle",
  "msg-sync-filled",
  "msg-async-open",
  "msg-reply-open",
] as const satisfies readonly MarkerId[];

export const UML_MARKER_SIZE = 10;

const HOLLOW_CLOSED_TRIANGLE_PATH = "M 0 0 L 10 5 L 0 10 Z";
const OPEN_V_PATH = "M 0 0 L 10 5 L 0 10";
const HOLLOW_DIAMOND_PATH = "M 0 5 L 5 0 L 10 5 L 5 10 Z";
const FILLED_DIAMOND_PATH = "M 0 5 L 5 0 L 10 5 L 5 10 Z";

const MARKER_GEOMETRY = {
  viewBox: "0 0 10 10",
  markerWidth: UML_MARKER_SIZE,
  markerHeight: UML_MARKER_SIZE,
  refX: 10,
  refY: 5,
  orient: "auto",
  markerUnits: "userSpaceOnUse",
  stroke: "currentColor",
} as const;

function marker(
  id: MarkerId,
  pathD: string,
  fill: SvgMarkerDef["fill"],
): SvgMarkerDef {
  return { id, pathD, fill, ...MARKER_GEOMETRY };
}

const SVG_MARKERS: Record<MarkerId, SvgMarkerDef> = {
  "gen-hollow-triangle": marker("gen-hollow-triangle", HOLLOW_CLOSED_TRIANGLE_PATH, "canvas"),
  "realize-hollow-triangle": marker("realize-hollow-triangle", HOLLOW_CLOSED_TRIANGLE_PATH, "canvas"),
  "assoc-open": marker("assoc-open", OPEN_V_PATH, "none"),
  "agg-hollow-diamond": marker("agg-hollow-diamond", HOLLOW_DIAMOND_PATH, "canvas"),
  "comp-filled-diamond": marker("comp-filled-diamond", FILLED_DIAMOND_PATH, "currentColor"),
  "dep-open": marker("dep-open", OPEN_V_PATH, "none"),
  "ext-filled-triangle": marker("ext-filled-triangle", HOLLOW_CLOSED_TRIANGLE_PATH, "currentColor"),
  "msg-sync-filled": marker("msg-sync-filled", HOLLOW_CLOSED_TRIANGLE_PATH, "currentColor"),
  "msg-async-open": marker("msg-async-open", OPEN_V_PATH, "none"),
  "msg-reply-open": marker("msg-reply-open", OPEN_V_PATH, "none"),
};

export { SVG_MARKERS };

export function getMarker(id: MarkerId): SvgMarkerDef {
  switch (id) {
    case "gen-hollow-triangle":
    case "realize-hollow-triangle":
    case "assoc-open":
    case "agg-hollow-diamond":
    case "comp-filled-diamond":
    case "dep-open":
    case "ext-filled-triangle":
    case "msg-sync-filled":
    case "msg-async-open":
    case "msg-reply-open":
      return SVG_MARKERS[id];
    default:
      return assertNever(id);
  }
}
