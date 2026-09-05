import { describe, expect, it } from "vitest";
import { getMarker, MARKER_IDS, SVG_MARKERS } from "./markers.js";
import type { MarkerId } from "./types.js";

const EXPECTED_MARKER_IDS: readonly MarkerId[] = [
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
];

const HOLLOW_MARKER_IDS: readonly MarkerId[] = [
  "gen-hollow-triangle",
  "realize-hollow-triangle",
  "assoc-open",
  "agg-hollow-diamond",
  "dep-open",
  "msg-async-open",
  "msg-reply-open",
];

const FILLED_MARKER_IDS: readonly MarkerId[] = [
  "comp-filled-diamond",
  "ext-filled-triangle",
  "msg-sync-filled",
];

describe("MARKER_IDS", () => {
  it("contains exactly 10 marker ids from section 8", () => {
    expect(MARKER_IDS).toHaveLength(10);
    expect([...MARKER_IDS].sort()).toEqual([...EXPECTED_MARKER_IDS].sort());
  });

  it("defines every marker with a non-empty path", () => {
    for (const id of MARKER_IDS) {
      const marker = getMarker(id);
      expect(marker.pathD.length).toBeGreaterThan(0);
      expect(marker.id).toBe(id);
      expect(marker.orient).toBe("auto");
      expect(marker.stroke).toBe("currentColor");
    }
  });

  it("uses hollow fill for open markers and filled fill for closed markers", () => {
    for (const id of HOLLOW_MARKER_IDS) {
      expect(getMarker(id).fill).toBe("none");
    }

    for (const id of FILLED_MARKER_IDS) {
      expect(getMarker(id).fill).toBe("currentColor");
    }
  });

  it("exposes SVG_MARKERS keyed by every marker id", () => {
    for (const id of MARKER_IDS) {
      expect(SVG_MARKERS[id]).toEqual(getMarker(id));
    }
  });

  it("sizes markers to one grid cell at zoom 1", () => {
    for (const id of MARKER_IDS) {
      expect(getMarker(id).markerWidth).toBe(16);
      expect(getMarker(id).markerHeight).toBe(16);
    }
  });
});
