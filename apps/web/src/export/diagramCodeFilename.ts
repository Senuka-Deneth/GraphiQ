import { detectMarkupKind } from "@graphiq/uml-dsl";

export function diagramCodeFilename(title: string, kind: string, dsl: string): string {
  const base = title
    .trim()
    .replace(/[^\w.-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const extension = detectMarkupKind(dsl) !== null ? "puml" : "dsl";
  return `${base.length > 0 ? base : kind}.${extension}`;
}
