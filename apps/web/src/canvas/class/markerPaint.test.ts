import { describe, expect, it } from "vitest";
import { DEFAULT_EDGE_COLOR } from "../canvasDefaults.js";
import {
  extraStrokeColors,
  markerDomId,
  paintedMarkerUrl,
  resolveMarkerFill,
  resolveMarkerStroke,
} from "./markerPaint.js";

describe("markerPaint", () => {
  it("keeps the notation id for the default edge color", () => {
    expect(markerDomId("gen-hollow-triangle", DEFAULT_EDGE_COLOR)).toBe("gen-hollow-triangle");
    expect(paintedMarkerUrl("gen-hollow-triangle", DEFAULT_EDGE_COLOR)).toBe(
      "url(#gen-hollow-triangle)",
    );
  });

  it("namespaces custom colors into a CSS-safe marker id", () => {
    expect(markerDomId("gen-hollow-triangle", "#ff00aa")).toBe("gen-hollow-triangle__ff00aa");
  });

  it("paints currentColor as the edge color and leaves hollow fills empty", () => {
    expect(resolveMarkerFill("none", DEFAULT_EDGE_COLOR)).toBe("none");
    expect(resolveMarkerFill("currentColor", DEFAULT_EDGE_COLOR)).toBe(DEFAULT_EDGE_COLOR);
    expect(resolveMarkerStroke("currentColor", DEFAULT_EDGE_COLOR)).toBe(DEFAULT_EDGE_COLOR);
  });

  it("drops default and duplicate extra stroke colors", () => {
    expect(extraStrokeColors([DEFAULT_EDGE_COLOR, "#ff0000", undefined, "#ff0000"])).toEqual([
      "#ff0000",
    ]);
  });
});
