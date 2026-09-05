import { describe, expect, it } from "vitest";
import { mergeOverlayEdgePresentation } from "./overlay.js";

describe("mergeOverlayEdgePresentation", () => {
  it("keeps route style, color, and stroke when layout rewrites waypoints", () => {
    const previous = {
      nodes: {},
      edges: {
        rel1: {
          id: "rel1",
          waypoints: [{ x: 0, y: 0 }],
          routeStyle: "straight" as const,
          strokeColor: "#0f172a",
          strokeWidth: 2,
        },
      },
    };
    const next = {
      nodes: {},
      edges: {
        rel1: {
          id: "rel1",
          waypoints: [
            { x: 10, y: 10 },
            { x: 40, y: 10 },
          ],
        },
      },
    };

    const merged = mergeOverlayEdgePresentation(previous, next);
    expect(merged.edges.rel1?.waypoints).toEqual([
      { x: 10, y: 10 },
      { x: 40, y: 10 },
    ]);
    expect(merged.edges.rel1?.routeStyle).toBe("straight");
    expect(merged.edges.rel1?.strokeColor).toBe("#0f172a");
    expect(merged.edges.rel1?.strokeWidth).toBe(2);
  });
});
