import { EOF, type CstNode, type CstParser, type IToken, type TokenType } from "chevrotain";

const IDENTIFIER_TITLE = /^[A-Za-z_][A-Za-z0-9_]*$/;

export function decodeQuotedLiteral(image: string): string {
  if (image.length < 2 || !image.startsWith('"') || !image.endsWith('"')) {
    return image;
  }

  return image.slice(1, -1).replace(/\\(.)/g, (_match, char: string) => {
    switch (char) {
      case "n":
        return "\n";
      case "r":
        return "\r";
      case "t":
        return "\t";
      default:
        return char;
    }
  });
}

export function formatDiagramTitle(name: string): string {
  if (IDENTIFIER_TITLE.test(name)) {
    return name;
  }

  const escaped = name
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\r/g, "\\r")
    .replace(/\n/g, "\\n")
    .replace(/\t/g, "\\t");
  return `"${escaped}"`;
}

export function formatDiagramHeader(keyword: string, name?: string): string {
  if (name === undefined) {
    return `diagram ${keyword}`;
  }
  return `diagram ${keyword} ${formatDiagramTitle(name)}`;
}

export function readDiagramTitle(value: unknown): string | undefined {
  const token = tokenFromTitle(value);
  if (token === undefined) {
    return undefined;
  }
  return decodeQuotedLiteral(token.image);
}

function tokenFromTitle(value: unknown): IToken | undefined {
  if (value === undefined || value === null || typeof value !== "object") {
    return undefined;
  }

  if ("image" in value && typeof value.image === "string" && !("children" in value)) {
    return value as IToken;
  }

  if (!("children" in value)) {
    return undefined;
  }

  const node = value as CstNode;
  const nested =
    node.children.StringLiteral?.[0] ??
    node.children.QuotedLiteral?.[0] ??
    node.children.QuotedMultiplicity?.[0] ??
    node.children.Identifier?.[0];
  if (nested && typeof nested === "object" && "image" in nested && typeof nested.image === "string") {
    return nested as IToken;
  }
  return undefined;
}

type DiagramTitleParser = {
  LA(howMuch: number): IToken;
  OPTION(definition: { GATE?: () => boolean; DEF: () => void }): void;
  OR1(alternatives: Array<{ GATE?: () => boolean; ALT: () => void }>): void;
  CONSUME(tokenType: TokenType, options?: { LABEL?: string }): IToken;
};

function asTitleParser(parser: CstParser): DiagramTitleParser {
  return parser as unknown as DiagramTitleParser;
}

function tokenOnSameLine(parser: DiagramTitleParser, tokenType: TokenType): boolean {
  const next = parser.LA(1);
  if (next.tokenType !== tokenType) {
    return false;
  }

  const previous = parser.LA(0);
  if (previous.tokenType === EOF) {
    return false;
  }

  return next.startLine === previous.startLine;
}

/**
 * Consumes a diagram title only when it stays on the header line.
 * Unquoted titles remain a single identifier. Spaces require quotes.
 */
export function optionalSameLineDiagramTitle(
  parser: CstParser,
  identifier: TokenType,
  quoted: TokenType,
): void {
  const api = asTitleParser(parser);
  api.OPTION({
    GATE: () => tokenOnSameLine(api, identifier) || tokenOnSameLine(api, quoted),
    DEF: () => {
      api.OR1([
        {
          GATE: () => api.LA(1).tokenType === quoted,
          ALT: () => api.CONSUME(quoted, { LABEL: "diagramName" }),
        },
        {
          ALT: () => api.CONSUME(identifier, { LABEL: "diagramName" }),
        },
      ]);
    },
  });
}

export function replaceDiagramHeaderTitle(source: string, name: string | undefined): string {
  const header = findDiagramHeader(source);
  if (header === undefined) {
    return source;
  }

  const title = name === undefined || name.length === 0 ? "" : ` ${formatDiagramTitle(name)}`;
  return `${source.slice(0, header.kindEnd)}${title}${source.slice(header.lineEnd)}`;
}

function findDiagramHeader(
  source: string,
): { kindEnd: number; lineEnd: number } | undefined {
  let offset = 0;
  if (source.charCodeAt(0) === 0xfeff) {
    offset = 1;
  }

  while (offset < source.length) {
    while (offset < source.length && (source[offset] === " " || source[offset] === "\t")) {
      offset += 1;
    }

    if (source.startsWith("//", offset)) {
      const nextLine = source.indexOf("\n", offset);
      offset = nextLine === -1 ? source.length : nextLine + 1;
      continue;
    }

    if (source.startsWith("/*", offset)) {
      const end = source.indexOf("*/", offset + 2);
      offset = end === -1 ? source.length : end + 2;
      continue;
    }

    if (source[offset] === "\n" || source[offset] === "\r") {
      offset += 1;
      continue;
    }

    break;
  }

  const match = /^diagram\s+[A-Za-z_][A-Za-z0-9_]*/.exec(source.slice(offset));
  if (match === null) {
    return undefined;
  }

  const kindEnd = offset + match[0].length;
  let lineEnd = kindEnd;
  while (lineEnd < source.length && source[lineEnd] !== "\n" && source[lineEnd] !== "\r") {
    lineEnd += 1;
  }
  return { kindEnd, lineEnd };
}
