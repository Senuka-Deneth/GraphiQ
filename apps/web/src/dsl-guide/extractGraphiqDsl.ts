import { isDiagramKind } from "@graphiq/uml-core";

export type ExtractedGraphiqDsl = {
  kind: string;
  dsl: string;
};

function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

function firstTokenLine(text: string): string | null {
  const trimmed = text.trimStart();
  if (trimmed.length === 0) {
    return null;
  }
  const lineEnd = trimmed.search(/\r?\n/);
  return lineEnd === -1 ? trimmed : trimmed.slice(0, lineEnd);
}

function parseDiagramHeaderLine(line: string): ExtractedGraphiqDsl | null {
  const tokens = line.trim().split(/\s+/);
  if (tokens.length < 2 || tokens[0] !== "diagram") {
    return null;
  }
  const kind = tokens[1];
  if (kind === undefined || !isDiagramKind(kind)) {
    return null;
  }
  return { kind, dsl: "" };
}

function extractFromDiagramHeader(text: string): ExtractedGraphiqDsl | null {
  const line = firstTokenLine(text);
  if (line === null) {
    return null;
  }
  const header = parseDiagramHeaderLine(line);
  if (header === null) {
    return null;
  }
  return { kind: header.kind, dsl: text.trim() };
}

function extractFromFencedBlocks(text: string): ExtractedGraphiqDsl | null {
  const fencePattern = /```[^\n]*\n([\s\S]*?)```/g;
  let match: RegExpExecArray | null;
  while ((match = fencePattern.exec(text)) !== null) {
    const body = match[1];
    if (body === undefined) {
      continue;
    }
    const extracted = extractFromDiagramHeader(body);
    if (extracted !== null) {
      return extracted;
    }
  }
  return null;
}

function extractFromUnfencedRegions(text: string): ExtractedGraphiqDsl | null {
  const lines = text.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (line === undefined) {
      continue;
    }
    const header = parseDiagramHeaderLine(line);
    if (header === null) {
      continue;
    }
    const dsl = lines.slice(index).join("\n").trim();
    return { kind: header.kind, dsl };
  }
  return null;
}

export function extractGraphiqDsl(text: string): ExtractedGraphiqDsl | null {
  const normalized = stripBom(text);
  const wholeFile = extractFromDiagramHeader(normalized);
  if (wholeFile !== null) {
    return wholeFile;
  }

  const fenced = extractFromFencedBlocks(normalized);
  if (fenced !== null) {
    return fenced;
  }

  return extractFromUnfencedRegions(normalized);
}
