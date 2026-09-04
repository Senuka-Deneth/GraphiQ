import { assertNever, err, ok } from "@graphiq/uml-core";
import type { DiagramKind, Diagnostic, Result } from "@graphiq/uml-core";
import type { CstNode } from "chevrotain";
import type { ClassDiagramAst } from "./ast.js";
import {
  KIND_MISMATCH_RULE_ID,
  headerParseDiagnostic,
  kindMismatchDiagnostic,
  lexerErrorToDiagnostic,
  parserErrorToDiagnostic,
  unsupportedKindDiagnostic,
} from "./diagnostics.js";
import { parseClassCst, parseClassDocument } from "./grammars/class.js";

export type ParseSuccess = {
  ast: ClassDiagramAst;
  cst: CstNode;
  diagnostics: Diagnostic[];
};

export type ParseFailure = {
  diagnostics: Diagnostic[];
};

export function parse(
  kind: DiagramKind,
  text: string,
): Result<ParseSuccess, ParseFailure> {
  switch (kind) {
    case "class":
      return parseClass(kind, text);
    case "object":
    case "package":
    case "compositeStructure":
    case "component":
    case "deployment":
    case "profile":
    case "useCase":
    case "activity":
    case "stateMachine":
    case "sequence":
    case "communication":
    case "timing":
    case "interactionOverview":
      return err({
        diagnostics: [unsupportedKindDiagnostic(kind)],
      });
    default:
      return assertNever(kind);
  }
}

function parseClass(
  expectedKind: "class",
  text: string,
): Result<ParseSuccess, ParseFailure> {
  const headerMismatch = detectHeaderKindMismatch(text, expectedKind);
  if (headerMismatch) {
    return err({ diagnostics: [headerMismatch] });
  }

  const { cst, lexerErrors, parserErrors } = parseClassCst(text);
  const diagnostics: Diagnostic[] = [
    ...lexerErrors.map(lexerErrorToDiagnostic),
    ...parserErrors.map(parserErrorToDiagnostic),
  ];

  const hasHeader = cst.children.DiagramKeyword !== undefined;
  if (!hasHeader) {
    return err({
      diagnostics:
        diagnostics.length > 0
          ? diagnostics
          : [headerParseDiagnostic("Expected diagram header")],
    });
  }

  const ast = parseClassDocument(cst);

  return ok({
    ast,
    cst,
    diagnostics,
  });
}

function detectHeaderKindMismatch(
  text: string,
  expectedKind: DiagramKind,
): Diagnostic | null {
  const match = /^\s*diagram\s+([A-Za-z_][A-Za-z0-9_]*)/.exec(text);
  if (!match) {
    return null;
  }

  const actualKind = match[1];
  if (!actualKind || actualKind === expectedKind) {
    return null;
  }

  const start = match.index + match[0].indexOf(actualKind);
  return {
    ...kindMismatchDiagnostic(expectedKind, actualKind),
    ruleId: KIND_MISMATCH_RULE_ID,
    dslSpan: {
      start,
      end: start + actualKind.length,
    },
  };
}
