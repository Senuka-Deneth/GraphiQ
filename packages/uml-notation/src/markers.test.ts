import { describe, expect, it } from "vitest";
import { getMarker, MARKER_IDS, SVG_MARKERS, UML_MARKER_SIZE } from "./markers.js";
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

const OPEN_MARKER_IDS: readonly MarkerId[] = [
  "assoc-open",
  "dep-open",
  "msg-async-open",
  "msg-reply-open",
];

const HOLLOW_CLOSED_MARKER_IDS: readonly MarkerId[] = [
  "gen-hollow-triangle",
  "realize-hollow-triangle",
  "agg-hollow-diamond",
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
      expect(marker.markerUnits).toBe("userSpaceOnUse");
    }
  });

  it("uses hollow fill for open markers and filled fill for closed markers", () => {
    for (const id of OPEN_MARKER_IDS) {
      expect(getMarker(id).fill).toBe("none");
    }

    for (const id of HOLLOW_CLOSED_MARKER_IDS) {
      expect(getMarker(id).fill).toBe("canvas");
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

  it("sizes markers in user space so stroke width cannot inflate them", () => {
    for (const id of MARKER_IDS) {
      expect(getMarker(id).markerWidth).toBe(UML_MARKER_SIZE);
      expect(getMarker(id).markerHeight).toBe(UML_MARKER_SIZE);
      expect(UML_MARKER_SIZE).toBe(10);
    }
  });
});
