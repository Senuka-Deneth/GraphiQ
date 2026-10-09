import { createId } from "@graphiq/uml-core";
import type { Diagnostic } from "@graphiq/uml-core";
import type { IRecognitionException, ILexingError } from "chevrotain";

export const PARSE_RULE_ID = "dsl.parse";
export const UNSUPPORTED_KIND_RULE_ID = "dsl.unsupported-kind";
export const KIND_MISMATCH_RULE_ID = "dsl.kind-mismatch";
export const PARSER_FAILURE_RULE_ID = "dsl.parser-failure";

export function finiteSpan(
  start: number | undefined,
  end: number | undefined,
): { start: number; end: number } | undefined {
  if (start === undefined || !Number.isFinite(start) || start < 0) {
    return undefined;
  }
  const safeEnd = end !== undefined && Number.isFinite(end) && end >= start ? end : start;
  return { start, end: safeEnd };
}

export function unsupportedKindDiagnostic(kind: string): Diagnostic {
  return {
    id: createId(),
    ruleId: UNSUPPORTED_KIND_RULE_ID,
    severity: "error",
    message: `parse not implemented for ${kind}`,
    elementIds: [],
  };
}

export function kindMismatchDiagnostic(expected: string, actual: string): Diagnostic {
  return {
    id: createId(),
    ruleId: KIND_MISMATCH_RULE_ID,
    severity: "error",
    message: `Expected diagram kind "${expected}" but found "${actual}"`,
    elementIds: [],
  };
}

export function headerParseDiagnostic(message: string, span?: { start: number; end: number }): Diagnostic {
  return {
    id: createId(),
    ruleId: PARSE_RULE_ID,
    severity: "error",
    message,
    elementIds: [],
    dslSpan: span,
  };
}

export function lexerErrorToDiagnostic(error: ILexingError, text = ""): Diagnostic {
  return {
    id: createId(),
    ruleId: PARSE_RULE_ID,
    severity: "error",
    message: `Unrecognized text ${JSON.stringify(text.slice(error.offset, error.offset + error.length).slice(0, 30))}. Remove it or check the DSL syntax.`,
    elementIds: [],
    dslSpan: finiteSpan(error.offset, error.offset + error.length),
  };
}

export function unexpectedParseDiagnostic(_error: unknown): Diagnostic {
  return {
    id: createId(),
    ruleId: PARSER_FAILURE_RULE_ID,
    severity: "error",
    message: "This document could not be read. Check the diagram header and incomplete statements.",
    elementIds: [],
  };
}

function friendlyToken(name: string): string {
  const labels: Record<string, string> = {
    Identifier: "a name (letters, numbers, or underscores)",
    LCurly: "\"{\"", RCurly: "\"}\"", LBracket: "\"[\"", RBracket: "\"]\"",
    Colon: "\":\"", Guard: "a guard such as [Available]", EOF: "the end of the document",
    FlowArrow: "\"-->\"", DiagramKeyword: "\"diagram\"",
  };
  return labels[name] ?? JSON.stringify(name.replace(/Keyword$/, "").replace(/^./, (letter) => letter.toLowerCase()));
}

export function parserErrorToDiagnostic(error: IRecognitionException, text = ""): Diagnostic {
  const token = error.token;
  const located = Number.isFinite(token.startOffset) && token.startOffset >= 0;
  const start = located ? token.startOffset : text.length;
  const end = located && Number.isFinite(token.endOffset) ? token.endOffset! + 1 : start;
  const found = token.image ? JSON.stringify(token.image.slice(0, 40)) : "the end of the document";
  const expected = /Expecting token of type --> (.*?) <--/.exec(error.message)?.[1];
  const rule = error.context.ruleStack.at(-1) ?? "document";
  let message = expected
    ? `Expected ${friendlyToken(expected)} before ${found}.`
    : `Unexpected ${found}. Check this statement's syntax.`;
  if (!expected && rule === "document") {
    message = `Unexpected ${found}. Start a declaration with a supported keyword, or connect declared names with an arrow.`;
  } else if (!expected && rule === "flowEndpoint") {
    message = `Expected a node name after the arrow. Declare it first, then use its name in the flow.`;
  }

  return {
    id: createId(),
    ruleId: PARSE_RULE_ID,
    severity: "error",
    message,
    elementIds: [],
    dslSpan: finiteSpan(start, end),
  };
}
