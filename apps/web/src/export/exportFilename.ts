import type { GraphiqDocument } from "../store/documentStore.js";

export type ExportFormat = "png" | "svg" | "pdf";

export function exportFilename(document: GraphiqDocument, extension: ExportFormat): string {
  const base =
    document.title.trim().length > 0
      ? document.title.trim().replace(/[^\w.-]+/g, "-").replace(/^-+|-+$/g, "")
      : document.kind;
  return `${base.length > 0 ? base : document.kind}.${extension}`;
}
