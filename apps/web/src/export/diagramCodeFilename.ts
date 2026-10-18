import { isSequenceMarkup } from "@graphiq/uml-dsl";

export function diagramCodeFilename(title: string, kind: string, dsl: string): string {
  const base = title
    .trim()
    .replace(/[^\w.-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const extension = isSequenceMarkup(dsl) ? "puml" : "dsl";
  return `${base.length > 0 ? base : kind}.${extension}`;
}
