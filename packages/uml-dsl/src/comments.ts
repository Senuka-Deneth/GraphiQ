import type { IToken } from "chevrotain";
import type { DslComment } from "./ast.js";

export function commentsFromLexerGroups(
  groups: Record<string, IToken[] | undefined> | undefined,
): DslComment[] {
  const tokens = groups?.comments ?? [];
  return tokens
    .map((token) => ({
      kind: token.tokenType.name === "BlockComment" ? ("block" as const) : ("line" as const),
      image: token.image,
      span: {
        start: token.startOffset,
        end: (token.endOffset ?? token.startOffset) + 1,
      },
    }))
    .sort((left, right) => left.span.start - right.span.start);
}
