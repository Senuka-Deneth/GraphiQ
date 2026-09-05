import { describe, expect, it } from "vitest";
import { emptyOverlay } from "@graphiq/uml-layout";
import { addElement, emptyModel } from "@graphiq/uml-model";
import type { GraphiqDocument } from "../store/documentStore.js";
import {
  containFit,
  cropToContentBounds,
  exportSheetSize,
  normalizeCrop,
  rectToSheetPixels,
  resolveExportRect,
  viewportForBounds,
  viewportWorldBounds,
} from "./exportBounds.js";
import { DEFAULT_EXPORT_SETTINGS } from "./exportSettings.js";

describe("exportBounds", () => {
  it("unions overlay boxes with padding for crop to content", () => {
    const first = addElement(emptyModel("class"), { elementType: "class", name: "A" });
    expect(first.ok).toBe(true);
    if (!first.ok) {
      throw new Error("expected class A");
    }
    const second = addElement(first.value, { elementType: "class", name: "B" });
    expect(second.ok).toBe(true);
    if (!second.ok) {
      throw new Error("expected class B");
    }
    const overlay = emptyOverlay();
    const idA = second.value.elements[0]?.id;
    const idB = second.value.elements[1]?.id;
    if (idA === undefined || idB === undefined) {
      throw new Error("expected element ids");
    }
    overlay.nodes[idA] = { id: idA, x: 10, y: 20, width: 100, height: 40 };
    overlay.nodes[idB] = { id: idB, x: 200, y: 80, width: 50, height: 30 };

    const bounds = cropToContentBounds(second.value, overlay, 10);
    expect(bounds).toEqual({ x: 0, y: 10, width: 260, height: 110 });
  });

  it("maps the editor viewport into world coordinates", () => {
    const bounds = viewportWorldBounds({ x: -100, y: -50, zoom: 2 }, 400, 300);
    expect(bounds).toEqual({ x: 50, y: 25, width: 200, height: 150 });
  });

  it("uses custom crop when that content mode is selected", () => {
    const document: GraphiqDocument = {
      id: "doc",
      kind: "class",
      title: "T",
      model: emptyModel("class"),
      overlay: emptyOverlay(),
      dsl: "diagram class\n",
    };
    const custom = { x: 4, y: 8, width: 40, height: 20 };
    const rect = resolveExportRect(
      { ...DEFAULT_EXPORT_SETTINGS, contentMode: "customCrop", customCrop: custom },
      document,
      { x: 0, y: 0, width: 800, height: 600 },
    );
    expect(rect).toEqual(custom);
  });

  it("uses paper pixels when set page size is on", () => {
    const sheet = exportSheetSize(
      { ...DEFAULT_EXPORT_SETTINGS, setPageSize: true, paperSize: "letter", orientation: "portrait" },
      { x: 0, y: 0, width: 10, height: 10 },
    );
    expect(sheet.width).toBe(Math.round(8.5 * 150));
    expect(sheet.height).toBe(Math.round(11 * 150));
  });

  it("fits content inside a frame without upscaling", () => {
    const fitted = containFit({ width: 200, height: 100 }, { width: 400, height: 400 }, 0);
    expect(fitted.width).toBe(200);
    expect(fitted.height).toBe(100);
    expect(fitted.x).toBe(100);
    expect(fitted.y).toBe(150);
  });

  it("clamps a custom crop to the parent bounds", () => {
    const crop = normalizeCrop(
      { x: -10, y: 0, width: 500, height: 20 },
      { x: 0, y: 0, width: 100, height: 80 },
    );
    expect(crop.x).toBe(0);
    expect(crop.width).toBe(100);
    expect(crop.height).toBe(20);
  });

  it("builds a viewport that maps a source rect onto a sheet", () => {
    const viewport = viewportForBounds({ x: 40, y: 20, width: 200, height: 100 }, 200, 100);
    expect(viewport.zoom).toBe(1);
    expect(viewport.x).toBe(-40);
    expect(viewport.y).toBe(-20);
  });

  it("maps a world crop onto sheet pixels", () => {
    const pixels = rectToSheetPixels(
      { x: 50, y: 30, width: 40, height: 20 },
      { x: 10, y: 10, width: 100, height: 80 },
      { width: 100, height: 80 },
    );
    expect(pixels.x).toBe(40);
    expect(pixels.y).toBe(20);
    expect(pixels.width).toBe(40);
    expect(pixels.height).toBe(20);
  });
});
