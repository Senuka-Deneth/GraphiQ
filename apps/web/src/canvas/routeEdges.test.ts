import { describe, expect, it } from "vitest";
import { orthogonalRoute, routeFlowEdges, segmentHitsBox } from "./routeEdges.js";
import { buildUmlFlowEdge, polylinePath } from "./class/UmlEdge.js";

describe("readable connector routing", () => {
  it("detours around blocking boxes without diagonal segments", () => {
    const obstacles = [{ x: 60, y: -30, width: 70, height: 60 }, { x: 150, y: 10, width: 50, height: 60 }];
    const path = orthogonalRoute({ x: 0, y: 0 }, { x: 250, y: 0 }, obstacles)!;
    expect(path.length).toBeGreaterThan(2);
    for (let i = 1; i < path.length; i++) {
      expect(path[i]!.x === path[i-1]!.x || path[i]!.y === path[i-1]!.y).toBe(true);
      for (const box of obstacles) expect(segmentHitsBox(path[i-1]!, path[i]!, box)).toBe(false);
    }
  });
  it("resolves nested node coordinates before routing", () => {
    const nodes = [
      { id: "group", position: { x: 200, y: 100 }, data: { width: 300, height: 300 } },
      { id: "child", parentId: "group", position: { x: 40, y: 60 }, data: { width: 100, height: 60 } },
      { id: "target", position: { x: 600, y: 160 }, data: { width: 100, height: 60 } },
    ];
    const result = routeFlowEdges(nodes, [{ id: "e", source: "child", target: "target", data: {} }]);
    const points = result[0]!.data!.waypoints as { x: number; y: number }[];
    expect(points[0]).toEqual({ x: 340, y: 190 });
    expect(points.at(-1)).toEqual({ x: 600, y: 190 });
  });
  it("uses computed bends and positions the label on the longest segment", () => {
    expect(polylinePath([{ x: 0, y: 0 }, { x: 0, y: 30 }, { x: 160, y: 30 }]))
      .toEqual(["M 0 0 L 0 30 L 160 30", 80, 30]);
  });
  it("retains UML keywords with custom names and association multiplicities", () => {
    const edge = buildUmlFlowEdge({ id: "e", sourceId: "a", targetId: "b", relationshipType: "packageImport", name: "shared" }, undefined, undefined);
    expect(edge.data?.label).toBe("«import» shared");
    const association = buildUmlFlowEdge({ id: "a", sourceId: "x", targetId: "y", relationshipType: "composition", sourceMultiplicity: "1", targetMultiplicity: "0..*" }, undefined, undefined);
    expect(association.data).toMatchObject({ sourceMultiplicity: "1", targetMultiplicity: "0..*" });
  });
});
