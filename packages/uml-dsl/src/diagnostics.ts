import { createId } from "@graphiq/uml-core";
import type { Diagnostic } from "@graphiq/uml-core";
import type { IRecognitionException, ILexingError } from "chevrotain";

export const PARSE_RULE_ID = "dsl.parse";
export const UNSUPPORTED_KIND_RULE_ID = "dsl.unsupported-kind";
export const KIND_MISMATCH_RULE_ID = "dsl.kind-mismatch";

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
    dslSpan: {
      start: error.offset,
      end: error.offset + error.length,
    },
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
    dslSpan: {
      start,
      end,
    },
  };
}
