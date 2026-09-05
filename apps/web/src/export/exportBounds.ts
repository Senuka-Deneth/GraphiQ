import { assertNever } from "@graphiq/uml-core";
import type { NotationOverlay } from "@graphiq/uml-layout";
import type { UmlModel } from "@graphiq/uml-model";
import { sequenceModelToSvg } from "../canvas/sequence/modelToSvg.js";
import { timingModelToSvg } from "../canvas/timing/modelToSvg.js";
import type { GraphiqDocument } from "../store/documentStore.js";
import {
  CONTENT_PADDING_PX,
  type ExportRect,
  type ExportSettings,
  paperSizePixels,
} from "./exportSettings.js";

export type { ExportRect };

const EMPTY_SHEET: ExportRect = { x: 0, y: 0, width: 640, height: 480 };

function absoluteOverlayBox(
  model: UmlModel,
  overlay: NotationOverlay,
  elementId: string,
): ExportRect | undefined {
  const node = overlay.nodes[elementId];
  if (node === undefined) {
    return undefined;
  }

  const element = model.elements.find((item) => item.id === elementId);
  if (element?.parentId === undefined) {
    return node;
  }

  const parentBox = absoluteOverlayBox(model, overlay, element.parentId);
  if (parentBox === undefined) {
    return node;
  }

  return {
    x: parentBox.x + node.x,
    y: parentBox.y + node.y,
    width: node.width,
    height: node.height,
  };
}

export function unionRects(rects: readonly ExportRect[], padding = 0): ExportRect {
  if (rects.length === 0) {
    return { ...EMPTY_SHEET };
  }

  const minX = Math.min(...rects.map((rect) => rect.x)) - padding;
  const minY = Math.min(...rects.map((rect) => rect.y)) - padding;
  const maxX = Math.max(...rects.map((rect) => rect.x + rect.width)) + padding;
  const maxY = Math.max(...rects.map((rect) => rect.y + rect.height)) + padding;
  return {
    x: minX,
    y: minY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY),
  };
}

export function cropToContentBounds(
  model: UmlModel,
  overlay: NotationOverlay,
  padding = CONTENT_PADDING_PX,
): ExportRect {
  const boxes = model.elements.flatMap((element) => {
    const box = absoluteOverlayBox(model, overlay, element.id);
    return box === undefined ? [] : [box];
  });
  return unionRects(boxes, padding);
}

export function viewportWorldBounds(
  viewport: { x: number; y: number; zoom: number },
  panelWidth: number,
  panelHeight: number,
): ExportRect {
  const zoom = viewport.zoom === 0 ? 1 : viewport.zoom;
  return {
    x: -viewport.x / zoom,
    y: -viewport.y / zoom,
    width: Math.max(1, panelWidth / zoom),
    height: Math.max(1, panelHeight / zoom),
  };
}

export function diagramContentBounds(
  document: GraphiqDocument,
  padding = CONTENT_PADDING_PX,
): ExportRect {
  const { kind, model, overlay } = document;
  switch (kind) {
    case "sequence": {
      const renderable = sequenceModelToSvg(model, overlay, []);
      return { x: 0, y: 0, width: renderable.width, height: renderable.height };
    }
    case "timing": {
      const renderable = timingModelToSvg(model, overlay, []);
      return { x: 0, y: 0, width: renderable.width, height: renderable.height };
    }
    case "class":
    case "object":
    case "package":
    case "component":
    case "deployment":
    case "profile":
    case "useCase":
    case "compositeStructure":
    case "communication":
    case "activity":
    case "stateMachine":
    case "interactionOverview":
      return cropToContentBounds(model, overlay, padding);
    default:
      return assertNever(kind);
  }
}

export function resolveExportRect(
  settings: ExportSettings,
  document: GraphiqDocument,
  editorViewport: ExportRect,
): ExportRect {
  switch (settings.contentMode) {
    case "cropToContent":
      return diagramContentBounds(document);
    case "fullCanvas":
      return editorViewport;
    case "customCrop":
      return settings.customCrop ?? diagramContentBounds(document);
    default:
      return assertNever(settings.contentMode);
  }
}

export function exportSheetSize(
  settings: ExportSettings,
  sourceRect: ExportRect,
): { width: number; height: number } {
  if (settings.setPageSize) {
    return paperSizePixels(settings.paperSize, settings.orientation);
  }
  return {
    width: Math.max(1, Math.round(sourceRect.width)),
    height: Math.max(1, Math.round(sourceRect.height)),
  };
}

export function containFit(
  content: { width: number; height: number },
  frame: { width: number; height: number },
  margin = CONTENT_PADDING_PX,
  maxScale = 1,
): ExportRect {
  const innerWidth = Math.max(1, frame.width - margin * 2);
  const innerHeight = Math.max(1, frame.height - margin * 2);
  const scale = Math.min(innerWidth / content.width, innerHeight / content.height, maxScale);
  const width = content.width * scale;
  const height = content.height * scale;
  return {
    x: (frame.width - width) / 2,
    y: (frame.height - height) / 2,
    width,
    height,
  };
}

export function rectToSheetPixels(
  worldRect: ExportRect,
  sourceRect: ExportRect,
  sheet: { width: number; height: number },
): ExportRect {
  const viewport = viewportForBounds(sourceRect, sheet.width, sheet.height);
  return {
    x: worldRect.x * viewport.zoom + viewport.x,
    y: worldRect.y * viewport.zoom + viewport.y,
    width: worldRect.width * viewport.zoom,
    height: worldRect.height * viewport.zoom,
  };
}

export function viewportForBounds(
  bounds: ExportRect,
  width: number,
  height: number,
): { x: number; y: number; zoom: number } {
  const zoom = Math.min(width / Math.max(1, bounds.width), height / Math.max(1, bounds.height));
  return {
    x: width / 2 - (bounds.x + bounds.width / 2) * zoom,
    y: height / 2 - (bounds.y + bounds.height / 2) * zoom,
    zoom,
  };
}

export function normalizeCrop(rect: ExportRect, bounds: ExportRect): ExportRect {
  const x = Math.min(Math.max(rect.x, bounds.x), bounds.x + bounds.width - 1);
  const y = Math.min(Math.max(rect.y, bounds.y), bounds.y + bounds.height - 1);
  const maxWidth = bounds.x + bounds.width - x;
  const maxHeight = bounds.y + bounds.height - y;
  return {
    x,
    y,
    width: Math.max(1, Math.min(rect.width, maxWidth)),
    height: Math.max(1, Math.min(rect.height, maxHeight)),
  };
}
