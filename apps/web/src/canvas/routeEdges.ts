import type { Edge, Node } from "@xyflow/react";
import type { UmlEdgeData } from "./class/UmlEdge.js";

type Point = { x: number; y: number };
type Box = Point & { width: number; height: number };
const GAP = 16;
const inside = (p: Point, b: Box) => p.x > b.x && p.x < b.x + b.width && p.y > b.y && p.y < b.y + b.height;
const contains = (p: Point, b: Box) => p.x >= b.x - 2 && p.x <= b.x + b.width + 2 && p.y >= b.y - 2 && p.y <= b.y + b.height + 2;

export function segmentHitsBox(a: Point, b: Point, box: Box): boolean {
  if (a.x === b.x) return a.x > box.x && a.x < box.x + box.width && Math.max(a.y, b.y) > box.y && Math.min(a.y, b.y) < box.y + box.height;
  if (a.y === b.y) return a.y > box.y && a.y < box.y + box.height && Math.max(a.x, b.x) > box.x && Math.min(a.x, b.x) < box.x + box.width;
  return true;
}

/** Visibility-grid shortest path, used where a layout supplies no usable route
 * (nested groups, swimlanes, ports, and nodes moved by the user). */
export function orthogonalRoute(start: Point, end: Point, obstacles: Box[]): Point[] | undefined {
  const clear = (a: Point, b: Point) => !obstacles.some(box => segmentHitsBox(a, b, box));
  const simple = [[start, { x: end.x, y: start.y }, end], [start, { x: start.x, y: end.y }, end]];
  for (const path of simple) if (path.slice(1).every((p, i) => clear(path[i]!, p))) return simplify(path);
  const xs = [...new Set([start.x, end.x, ...obstacles.flatMap(b => [b.x - GAP, b.x + b.width + GAP])])].sort((a, b) => a - b);
  const ys = [...new Set([start.y, end.y, ...obstacles.flatMap(b => [b.y - GAP, b.y + b.height + GAP])])].sort((a, b) => a - b);
  const point = (id: number): Point => ({ x: xs[id % xs.length]!, y: ys[Math.floor(id / xs.length)]! });
  const idOf = (p: Point) => ys.indexOf(p.y) * xs.length + xs.indexOf(p.x);
  const first = idOf(start), goal = idOf(end);
  const distances = new Map<number, number>([[first, 0]]);
  const previous = new Map<number, number>();
  const open = new Set([first]);
  const visited = new Set<number>();
  while (open.size) {
    let current = first, best = Infinity;
    for (const id of open) {
      const p = point(id);
      const score = distances.get(id)! + Math.abs(p.x - end.x) + Math.abs(p.y - end.y);
      if (score < best) { current = id; best = score; }
    }
    if (current === goal) {
      const path = [end];
      while (current !== first) { current = previous.get(current)!; path.unshift(point(current)); }
      return simplify(path);
    }
    open.delete(current); visited.add(current);
    const p = point(current), xi = current % xs.length, yi = Math.floor(current / xs.length);
    const neighbors = [xi > 0 ? current - 1 : -1, xi < xs.length - 1 ? current + 1 : -1,
      yi > 0 ? current - xs.length : -1, yi < ys.length - 1 ? current + xs.length : -1];
    for (const next of neighbors) {
      if (next < 0 || visited.has(next)) continue;
      const q = point(next);
      if (obstacles.some(b => inside(q, b)) || !clear(p, q)) continue;
      const cost = distances.get(current)! + Math.abs(q.x - p.x) + Math.abs(q.y - p.y);
      if (cost < (distances.get(next) ?? Infinity)) { distances.set(next, cost); previous.set(next, current); open.add(next); }
    }
  }
  return undefined;
}

function simplify(points: Point[]): Point[] {
  const unique = points.filter((p, i) => i === 0 || p.x !== points[i - 1]!.x || p.y !== points[i - 1]!.y);
  return unique.filter((p, i) => i === 0 || i === unique.length - 1 ||
    !((unique[i - 1]!.x === p.x && p.x === unique[i + 1]!.x) || (unique[i - 1]!.y === p.y && p.y === unique[i + 1]!.y)));
}

export function routeFlowEdges(nodes: Node[], edges: Edge[]): Edge[] {
  const byId = new Map(nodes.map(n => [n.id, n]));
  const boxes = new Map<string, Box>();
  function absolute(node: Node, seen = new Set<string>()): Box {
    const cached = boxes.get(node.id);
    if (cached) return cached;
    const parent = node.parentId ? byId.get(node.parentId) : undefined;
    seen.add(node.id);
    const origin = parent && !seen.has(parent.id) ? absolute(parent, seen) : { x: 0, y: 0 };
    const box = { x: origin.x + node.position.x, y: origin.y + node.position.y,
      width: Number(node.data.width ?? node.width ?? 0), height: Number(node.data.height ?? node.height ?? 0) };
    boxes.set(node.id, box); return box;
  }
  nodes.forEach(n => absolute(n));
  const containers = new Set(nodes.map(n => n.parentId).filter(Boolean));
  return edges.map(edge => {
    const source = boxes.get(edge.source), target = boxes.get(edge.target);
    const data = edge.data as UmlEdgeData | undefined;
    if (!source || !target || (data?.routeStyle && data.routeStyle !== "orthogonal")) return edge;
    const obstacles = nodes.flatMap(node => {
      if (node.id === edge.source || node.id === edge.target) return [];
      const box = boxes.get(node.id)!;
      // Interior groups are traversable, but reserve their title band.
      if (containers.has(node.id) && node.type !== "componentNode") return [{ ...box, height: Math.min(32, box.height) }];
      return [box];
    });
    const points = data?.waypoints;
    if (points && points.length > 1 && contains(points[0]!, source) && contains(points[points.length - 1]!, target) &&
      points.slice(1).every((p, i) => !obstacles.some(b => segmentHitsBox(points[i]!, p, b)))) return edge;
    const dx = target.x + target.width / 2 - source.x - source.width / 2;
    const dy = target.y + target.height / 2 - source.y - source.height / 2;
    const anchors = (box: Box, other: Box, outgoing: boolean): Point => {
      const node = byId.get(outgoing ? edge.source : edge.target)!;
      if (node.type === "actorNode") return { x: box.x + box.width / 2 + (other.x > box.x ? 12 : -12), y: box.y + 20 };
      if (node.type === "interfaceLollipopNode") return { x: box.x + (node.data.role === "provided" ? 12 : box.width - 12), y: box.y + 32 };
      if (Math.abs(dx) > Math.abs(dy)) return { x: box.x + (other.x > box.x ? box.width : 0), y: box.y + box.height / 2 };
      return { x: box.x + box.width / 2, y: box.y + (other.y > box.y ? box.height : 0) };
    };
    const start = anchors(source, target, true), end = anchors(target, source, false);
    const outward = (point: Point, box: Box, node: Node): Point => {
      if (node.type === "interfaceLollipopNode") return { x: node.data.role === "provided" ? -1 : 1, y: 0 };
      if (node.type === "actorNode") return { x: point.x > box.x + box.width / 2 ? 1 : -1, y: 0 };
      if (Math.abs(point.x - box.x) < 1) return { x: -1, y: 0 };
      if (Math.abs(point.x - box.x - box.width) < 1) return { x: 1, y: 0 };
      return { x: 0, y: point.y < box.y + box.height / 2 ? -1 : 1 };
    };
    const a = outward(start, source, byId.get(edge.source)!);
    const b = outward(end, target, byId.get(edge.target)!);
    const startStub = { x: start.x + a.x * GAP, y: start.y + a.y * GAP };
    const endStub = { x: end.x + b.x * GAP, y: end.y + b.y * GAP };
    const middle = orthogonalRoute(startStub, endStub, obstacles);
    const route = edge.source === edge.target
      ? [{ x: source.x + source.width, y: source.y + source.height / 3 }, { x: source.x + source.width + 40, y: source.y + source.height / 3 }, { x: source.x + source.width + 40, y: source.y + source.height * 2 / 3 }, { x: source.x + source.width, y: source.y + source.height * 2 / 3 }]
      : middle ? simplify([start, ...middle, end]) : undefined;
    return { ...edge, data: { ...data, waypoints: route } };
  });
}
