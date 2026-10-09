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

export function lexerErrorToDiagnostic(error: ILexingError): Diagnostic {
  return {
    id: createId(),
    ruleId: PARSE_RULE_ID,
    severity: "error",
    message: error.message,
    elementIds: [],
    dslSpan: finiteSpan(error.offset, error.offset + error.length),
  };
}

export function unexpectedParseDiagnostic(error: unknown): Diagnostic {
  const message = error instanceof Error ? error.message : "Unexpected parser failure";
  return {
    id: createId(),
    ruleId: PARSER_FAILURE_RULE_ID,
    severity: "error",
    message,
    elementIds: [],
  };
}

export function parserErrorToDiagnostic(error: IRecognitionException): Diagnostic {
  const token = error.token;
  const start = token.startOffset;
  const end = token.endOffset !== undefined ? token.endOffset + 1 : start + 1;

  return {
    id: createId(),
    ruleId: PARSE_RULE_ID,
    severity: "error",
    message: error.message,
    elementIds: [],
    dslSpan: finiteSpan(start, end),
  };
}
