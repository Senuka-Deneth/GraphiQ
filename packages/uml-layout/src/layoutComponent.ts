import type { UmlElement, UmlModel } from "@graphiq/uml-model";
import { layoutWithElk, type ElkGraphInput } from "./elk.js";
import type { LayoutMode, NotationOverlay, OverlayNode } from "./overlay.js";

export function measureComponentNode(element: UmlElement): Pick<OverlayNode, "width" | "height"> {
  if (element.elementType === "port") return { width: 16, height: 16 };
  if (element.elementType === "interface") return { width: Math.max(100, element.name.length * 7 + 28), height: 56 };
  return { width: Math.max(200, element.name.length * 9 + 48), height: element.elementType === "component" ? 112 : 72 };
}

/** Interface strips are reserved in the layout envelope, outside the component body.
 * Fixed ELK ports route assemblies to the ball/socket rather than through the box. */
export async function layoutComponent(model: UmlModel, overlay: NotationOverlay, mode: LayoutMode): Promise<NotationOverlay> {
  const required = new Set(model.relationships.filter(r => r.relationshipType === "usage").map(r => r.targetId));
  const nodes: Record<string, OverlayNode> = {};
  const envelopes = new Map<string, { left: number; bodyWidth: number; height: number }>();
  const children: ElkGraphInput[] = model.elements.filter(e => !e.parentId).map(element => {
    const owned = model.elements.filter(e => e.parentId === element.id);
    const provided = owned.filter(e => e.elementType === "interface" && !required.has(e.id));
    const needed = owned.filter(e => e.elementType === "interface" && required.has(e.id));
    const ports = owned.filter(e => e.elementType === "port");
    const interior = owned.filter(e => e.elementType !== "interface" && e.elementType !== "port");
    const measured = measureComponentNode(element);
    const left = provided.length ? Math.max(...provided.map(e => measureComponentNode(e).width)) : 0;
    const right = needed.length ? Math.max(...needed.map(e => measureComponentNode(e).width)) : 0;
    const bodyWidth = Math.max(measured.width, ...interior.map(e => measureComponentNode(e).width + 40), ports.length * 64);
    const height = Math.max(measured.height, 72 + Math.max(provided.length, needed.length) * 64, 72 + interior.length * 96);
    envelopes.set(element.id, { left, bodyWidth, height });
    const elkPorts: NonNullable<ElkGraphInput["ports"]> = [];
    for (const [side, items] of [["WEST", provided], ["EAST", needed]] as const) {
      items.forEach((item, index) => {
        const width = side === "WEST" ? left : right;
        const x = side === "WEST" ? -left : bodyWidth;
        const y = 64 + index * 64;
        nodes[item.id] = { id: item.id, x, y, width, height: 56 };
        elkPorts.push({ id: item.id, x: side === "WEST" ? 12 : left + bodyWidth + right - 12, y: y + 32, width: 0, height: 0,
          layoutOptions: { "elk.port.side": side } });
      });
    }
    ports.forEach((port, index) => {
      const x = (index + 1) * bodyWidth / (ports.length + 1) - 8;
      nodes[port.id] = { id: port.id, x, y: height - 8, width: 16, height: 16 };
      elkPorts.push({ id: port.id, x: left + x + 8, y: height, width: 0, height: 0, layoutOptions: { "elk.port.side": "SOUTH" } });
    });
    interior.forEach((item, index) => {
      nodes[item.id] = { id: item.id, x: 20, y: 64 + index * 96, ...measureComponentNode(item) };
    });
    return { id: element.id, width: left + bodyWidth + right, height: height + (ports.length ? 24 : 0), ports: elkPorts,
      layoutOptions: { "elk.portConstraints": "FIXED_POS" } };
  });
  const ids = new Set(children.flatMap(n => [n.id, ...(n.ports ?? []).map(p => p.id)]));
  const edges = model.relationships.filter(r => r.relationshipType !== "usage" && r.relationshipType !== "interfaceRealization" && ids.has(r.sourceId) && ids.has(r.targetId))
    .map(r => ({ id: r.id, sources: [r.sourceId], targets: [r.targetId] }));
  const result = await layoutWithElk({ id: "root", children, edges, layoutOptions: {
    "elk.algorithm": "layered", "elk.direction": "RIGHT", "elk.edgeRouting": "ORTHOGONAL",
    "elk.spacing.nodeNode": "80", "elk.layered.spacing.nodeNodeBetweenLayers": "120",
    "elk.spacing.edgeNode": "32", "elk.layered.spacing.edgeEdgeBetweenLayers": "24",
  } });
  for (const child of result.children ?? []) {
    const box = envelopes.get(child.id)!;
    nodes[child.id] = { id: child.id, x: (child.x ?? 0) + box.left, y: child.y ?? 0, width: box.bodyWidth, height: box.height };
  }
  // Incremental canvas edits retain user positions. Discard automatic routes when
  // their endpoints no longer correspond to the calculated positions.
  let moved = false;
  if (mode === "incremental") {
    for (const [id, node] of Object.entries(nodes)) {
      const prior = overlay.nodes[id];
      if (prior) {
        moved ||= prior.x !== node.x || prior.y !== node.y;
        nodes[id] = { ...node, x: prior.x, y: prior.y };
      }
    }
  }
  return { ...overlay, nodes, edges: Object.fromEntries(model.relationships.map(r => {
    const edge = result.edges?.find(e => e.id === r.id);
    const waypoints = moved ? undefined : edge?.sections?.flatMap(s => [s.startPoint, ...(s.bendPoints ?? []), s.endPoint]);
    return [r.id, { ...overlay.edges[r.id], id: r.id, waypoints }];
  })) };
}
