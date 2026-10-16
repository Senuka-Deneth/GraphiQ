import activityDsl from "../../../../packages/uml-dsl/src/fixtures/activity-fulfill-order.dsl?raw";
import storefrontDsl from "../../e2e/fixtures/component-storefront.dsl?raw";
import { describe, expect, it } from "vitest";
import { compileDiagram } from "@graphiq/uml-print";
import { emptyModel } from "@graphiq/uml-model";
import { emptyOverlay, layoutDocument } from "@graphiq/uml-layout";
import { componentModelToFlow } from "./component/modelToFlow.js";
import { segmentHitsBox } from "./routeEdges.js";

describe("component generation geometry", () => {
  it("keeps long names, interfaces, ports, and assembly routes clear of component bodies", async () => {
    const dsl = storefrontDsl;
    const compiled = compileDiagram("component", dsl, emptyModel("component"));
    expect(compiled.diagnostics).toEqual([]);
    const model = compiled.model!;
    const overlay = await layoutDocument("component", model, emptyOverlay(), "first-open-empty-overlay");
    const components = model.elements.filter(e => e.elementType === "component");
    for (const component of components) {
      const box = overlay.nodes[component.id]!;
      expect(box.width).toBeGreaterThan(component.name.length * 8);
      for (const other of components) {
        if (other.id === component.id) continue;
        const b = overlay.nodes[other.id]!;
        expect(box.x < b.x + b.width && box.x + box.width > b.x && box.y < b.y + b.height && box.y + box.height > b.y).toBe(false);
      }
    }
    for (const element of model.elements.filter(e => e.elementType === "interface")) {
      const node = overlay.nodes[element.id]!, owner = overlay.nodes[element.parentId!]!;
      expect(node.x + node.width <= 0 || node.x >= owner.width).toBe(true);
      expect(node.width).toBeGreaterThan(element.name.length * 6);
    }
    for (const relation of model.relationships.filter(r => r.relationshipType === "assemblyConnector")) {
      const points = overlay.edges[relation.id]!.waypoints!;
      expect(points.length).toBeGreaterThanOrEqual(2);
      for (let i = 1; i < points.length; i++) for (const component of components) {
        expect(segmentHitsBox(points[i - 1]!, points[i]!, overlay.nodes[component.id]!)).toBe(false);
      }
    }
    const flow = componentModelToFlow(model, overlay, []);
    for (const node of flow.nodes.filter(n => n.type === "interfaceLollipopNode")) expect(node.extent).toBeUndefined();
    expect(flow.edges).toHaveLength(6);
  });
});


it("preserves top-to-bottom activity order across swimlanes", async () => {
  const model = compileDiagram("activity", activityDsl, emptyModel("activity")).model!;
  const overlay = await layoutDocument("activity", model, emptyOverlay(), "first-open-empty-overlay");
  const absoluteY = (id: string): number => {
    const element = model.elements.find(e => e.id === id)!;
    return overlay.nodes[id]!.y + (element.parentId ? absoluteY(element.parentId) : 0);
  };
  for (const edge of model.relationships) expect(absoluteY(edge.targetId)).toBeGreaterThan(absoluteY(edge.sourceId));
});
