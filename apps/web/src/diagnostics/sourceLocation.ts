import type { DslSpan } from "@graphiq/uml-core";

export function sourceLocation(text: string, span: DslSpan | undefined) {
  if (span === undefined || !Number.isFinite(span.start) || !Number.isFinite(span.end)) return undefined;
  const start = Math.max(0, Math.min(text.length, span.start));
  const end = Math.max(start, Math.min(text.length, span.end));
  const before = text.slice(0, start);
  const line = before.split("\n").length;
  const column = start - before.lastIndexOf("\n");
  return { start, end, line, column };
}
