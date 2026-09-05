import type { GraphiqDocument } from "../store/documentStore.js";
import { downloadBlob, downloadText } from "./downloadExport.js";
import { rasterizeSvgToPng } from "./rasterizeSvg.js";
import { serializeDiagramSvg } from "./serializeDiagramSvg.js";

function exportFilename(document: GraphiqDocument, extension: "svg" | "png"): string {
  const base =
    document.title.trim().length > 0
      ? document.title.trim().replace(/[^\w.-]+/g, "-")
      : document.kind;
  return `${base}.${extension}`;
}

export function exportDocumentSvg(document: GraphiqDocument): void {
  const svg = serializeDiagramSvg(document);
  downloadText(svg, exportFilename(document, "svg"), "image/svg+xml;charset=utf-8");
}

export async function exportDocumentPng(document: GraphiqDocument): Promise<void> {
  const svg = serializeDiagramSvg(document);
  const pngBlob = await rasterizeSvgToPng(svg);
  downloadBlob(pngBlob, exportFilename(document, "png"));
}
