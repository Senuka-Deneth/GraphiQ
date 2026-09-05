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

const HOLLOW_CLOSED_TRIANGLE_PATH = "M 0 0 L 10 5 L 0 10 Z";
const OPEN_V_PATH = "M 0 0 L 10 5 L 0 10";
const HOLLOW_DIAMOND_PATH = "M 0 5 L 5 0 L 10 5 L 5 10 Z";
const FILLED_DIAMOND_PATH = "M 0 5 L 5 0 L 10 5 L 5 10 Z";

const SVG_MARKERS: Record<MarkerId, SvgMarkerDef> = {
  "gen-hollow-triangle": {
    id: "gen-hollow-triangle",
    viewBox: "0 0 10 10",
    markerWidth: 16,
    markerHeight: 16,
    refX: 10,
    refY: 5,
    orient: "auto",
    fill: "none",
    stroke: "currentColor",
    pathD: HOLLOW_CLOSED_TRIANGLE_PATH,
  },
  "realize-hollow-triangle": {
    id: "realize-hollow-triangle",
    viewBox: "0 0 10 10",
    markerWidth: 16,
    markerHeight: 16,
    refX: 10,
    refY: 5,
    orient: "auto",
    fill: "none",
    stroke: "currentColor",
    pathD: HOLLOW_CLOSED_TRIANGLE_PATH,
  },
  "assoc-open": {
    id: "assoc-open",
    viewBox: "0 0 10 10",
    markerWidth: 16,
    markerHeight: 16,
    refX: 10,
    refY: 5,
    orient: "auto",
    fill: "none",
    stroke: "currentColor",
    pathD: OPEN_V_PATH,
  },
  "agg-hollow-diamond": {
    id: "agg-hollow-diamond",
    viewBox: "0 0 10 10",
    markerWidth: 16,
    markerHeight: 16,
    refX: 10,
    refY: 5,
    orient: "auto",
    fill: "none",
    stroke: "currentColor",
    pathD: HOLLOW_DIAMOND_PATH,
  },
  "comp-filled-diamond": {
    id: "comp-filled-diamond",
    viewBox: "0 0 10 10",
    markerWidth: 16,
    markerHeight: 16,
    refX: 10,
    refY: 5,
    orient: "auto",
    fill: "currentColor",
    stroke: "currentColor",
    pathD: FILLED_DIAMOND_PATH,
  },
  "dep-open": {
    id: "dep-open",
    viewBox: "0 0 10 10",
    markerWidth: 16,
    markerHeight: 16,
    refX: 10,
    refY: 5,
    orient: "auto",
    fill: "none",
    stroke: "currentColor",
    pathD: OPEN_V_PATH,
  },
  "ext-filled-triangle": {
    id: "ext-filled-triangle",
    viewBox: "0 0 10 10",
    markerWidth: 16,
    markerHeight: 16,
    refX: 10,
    refY: 5,
    orient: "auto",
    fill: "currentColor",
    stroke: "currentColor",
    pathD: HOLLOW_CLOSED_TRIANGLE_PATH,
  },
  "msg-sync-filled": {
    id: "msg-sync-filled",
    viewBox: "0 0 10 10",
    markerWidth: 16,
    markerHeight: 16,
    refX: 10,
    refY: 5,
    orient: "auto",
    fill: "currentColor",
    stroke: "currentColor",
    pathD: HOLLOW_CLOSED_TRIANGLE_PATH,
  },
  "msg-async-open": {
    id: "msg-async-open",
    viewBox: "0 0 10 10",
    markerWidth: 16,
    markerHeight: 16,
    refX: 10,
    refY: 5,
    orient: "auto",
    fill: "none",
    stroke: "currentColor",
    pathD: OPEN_V_PATH,
  },
  "msg-reply-open": {
    id: "msg-reply-open",
    viewBox: "0 0 10 10",
    markerWidth: 16,
    markerHeight: 16,
    refX: 10,
    refY: 5,
    orient: "auto",
    fill: "none",
    stroke: "currentColor",
    pathD: OPEN_V_PATH,
  },
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
