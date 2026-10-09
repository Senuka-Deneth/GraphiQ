import { createToken } from "chevrotain";

/** Quoted text, including escaped quotes, that stays on one line. */
export const quotedLiteralPattern = /"(?:\\.|[^"\\\r\n])*"/;

export const QuotedLiteral = createToken({
  name: "QuotedLiteral",
  pattern: quotedLiteralPattern,
});
