import { assertNever } from "@graphiq/uml-core";
import type { GraphiqDocument } from "../store/documentStore.js";
import { captureElementPng, captureElementSvg, waitForExportPaint } from "./captureLiveDiagram.js";
import { downloadBlob, downloadText } from "./downloadExport.js";
import { embedPngBlobInPdf } from "./embedRasterInPdf.js";
import { exportFilename } from "./exportFilename.js";
import {
  type ExportRect,
  type ExportSettings,
  paperSizePoints,
} from "./exportSettings.js";

function cssPxToPt(px: number): number {
  return (px * 72) / 96;
}

export async function downloadCapturedDiagram(options: {
  document: GraphiqDocument;
  captureRoot: HTMLElement;
  settings: ExportSettings;
  sheetSize: { width: number; height: number };
  clip?: ExportRect;
}): Promise<void> {
  const { document, captureRoot, settings, sheetSize, clip } = options;
  const backgroundColor = settings.includePageFill ? "#ffffff" : undefined;
  const captureOptions = {
    width: sheetSize.width,
    height: sheetSize.height,
    backgroundColor,
    clip,
  };
  await waitForExportPaint();

  switch (settings.format) {
    case "png": {
      const png = await captureElementPng(captureRoot, captureOptions);
      downloadBlob(png, exportFilename(document, "png"));
      return;
    }
    case "svg": {
      const svg = await captureElementSvg(captureRoot, captureOptions);
      downloadText(svg, exportFilename(document, "svg"), "image/svg+xml;charset=utf-8");
      return;
    }
    case "pdf": {
      const png = await captureElementPng(captureRoot, captureOptions);
      const page = settings.setPageSize
        ? paperSizePoints(settings.paperSize, settings.orientation)
        : {
            width: cssPxToPt(sheetSize.width),
            height: cssPxToPt(sheetSize.height),
          };
      const pdf = await embedPngBlobInPdf(png, page.width, page.height);
      downloadBlob(pdf, exportFilename(document, "pdf"));
      return;
    }
    default:
      assertNever(settings.format);
  }
}
