import { assertNever } from "@graphiq/uml-core";
import type { ExportFormat } from "./exportFilename.js";

export type { ExportFormat };

export type ExportEntryState = {
  panelWidth: number;
  panelHeight: number;
};

export type ExportContentMode = "fullCanvas" | "cropToContent" | "customCrop";

export type PaperSizeId = "a4" | "letter" | "a3";

export type PageOrientation = "portrait" | "landscape";

export type ExportRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type ExportSettings = {
  format: ExportFormat;
  contentMode: ExportContentMode;
  customCrop: ExportRect | null;
  setPageSize: boolean;
  paperSize: PaperSizeId;
  orientation: PageOrientation;
  includePageFill: boolean;
};

export const DEFAULT_EXPORT_SETTINGS: ExportSettings = {
  format: "png",
  contentMode: "cropToContent",
  customCrop: null,
  setPageSize: false,
  paperSize: "a4",
  orientation: "portrait",
  includePageFill: true,
};

export const PAPER_SIZE_INCHES: Record<PaperSizeId, { width: number; height: number }> = {
  a4: { width: 8.27, height: 11.69 },
  letter: { width: 8.5, height: 11 },
  a3: { width: 11.69, height: 16.54 },
};

export const EXPORT_PIXEL_RATIO = 2;
export const EXPORT_PAGE_DPI = 150;
export const CONTENT_PADDING_PX = 32;

export function paperDimensionsInches(
  paperSize: PaperSizeId,
  orientation: PageOrientation,
): { width: number; height: number } {
  const portrait = PAPER_SIZE_INCHES[paperSize];
  switch (orientation) {
    case "portrait":
      return portrait;
    case "landscape":
      return { width: portrait.height, height: portrait.width };
    default:
      return assertNever(orientation);
  }
}

export function paperSizePixels(
  paperSize: PaperSizeId,
  orientation: PageOrientation,
  dpi = EXPORT_PAGE_DPI,
): { width: number; height: number } {
  const inches = paperDimensionsInches(paperSize, orientation);
  return {
    width: Math.round(inches.width * dpi),
    height: Math.round(inches.height * dpi),
  };
}

export function paperSizePoints(
  paperSize: PaperSizeId,
  orientation: PageOrientation,
): { width: number; height: number } {
  const inches = paperDimensionsInches(paperSize, orientation);
  return {
    width: inches.width * 72,
    height: inches.height * 72,
  };
}

export function contentModeLabel(mode: ExportContentMode): string {
  switch (mode) {
    case "fullCanvas":
      return "Full canvas";
    case "cropToContent":
      return "Crop to content";
    case "customCrop":
      return "Custom crop";
    default:
      return assertNever(mode);
  }
}

export function paperSizeLabel(paperSize: PaperSizeId): string {
  switch (paperSize) {
    case "a4":
      return "A4";
    case "letter":
      return "Letter";
    case "a3":
      return "A3";
    default:
      return assertNever(paperSize);
  }
}
