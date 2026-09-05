import { describe, expect, it } from "vitest";
import { exportDomFilter, inlineSvgMarkers } from "./captureLiveDiagram.js";

describe("exportDomFilter", () => {
  it("keeps diagram nodes and drops editor chrome", () => {
    const node = document.createElement("div");
    node.className = "react-flow__node";
    expect(exportDomFilter(node)).toBe(true);

    const handle = document.createElement("div");
    handle.className = "react-flow__handle source";
    expect(exportDomFilter(handle)).toBe(false);

    const crop = document.createElement("div");
    crop.setAttribute("data-testid", "export-crop-overlay");
    expect(exportDomFilter(crop)).toBe(false);

    const zoom = document.createElement("button");
    zoom.setAttribute("data-testid", "flow-zoom-in");
    expect(exportDomFilter(zoom)).toBe(false);
  });
});

describe("inlineSvgMarkers", () => {
  it("copies marker defs into the SVG that paints the edge", () => {
    const svgNs = "http://www.w3.org/2000/svg";
    const root = document.createElement("div");
    const host = document.createElementNS(svgNs, "svg");
    const defs = document.createElementNS(svgNs, "defs");
    const marker = document.createElementNS(svgNs, "marker");
    marker.id = "gen-hollow-triangle";
    defs.appendChild(marker);
    host.appendChild(defs);

    const edge = document.createElementNS(svgNs, "svg");
    const path = document.createElementNS(svgNs, "path");
    path.setAttribute("d", "M0 0 L10 10");
    path.setAttribute("marker-end", "url(#gen-hollow-triangle)");
    edge.appendChild(path);
    root.append(host, edge);
    document.body.appendChild(root);

    const restore = inlineSvgMarkers(root);
    expect(edge.querySelector("marker#gen-hollow-triangle")).not.toBeNull();
    expect(host.querySelector("marker")?.hasAttribute("id")).toBe(false);

    restore();
    expect(host.querySelector("marker")?.id).toBe("gen-hollow-triangle");
    expect(edge.querySelector("marker#gen-hollow-triangle")).toBeNull();
    root.remove();
  });
});
