import { describe, expect, it } from "vitest";
import { exportDomFilter } from "./captureLiveDiagram.js";

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
