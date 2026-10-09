import { linter, type Diagnostic as LintDiagnostic } from "@codemirror/lint";
import { Compartment, type Extension } from "@codemirror/state";
import type { Diagnostic } from "@graphiq/uml-core";
import { sourceLocation } from "../diagnostics/sourceLocation.js";

function expandSpanToLine(text: string, span: { start: number; end: number }): {
  from: number;
  to: number;
} {
  if (span.end > span.start) {
    return { from: span.start, to: span.end };
  }

  const lineStart = text.lastIndexOf("\n", span.start - 1) + 1;
  const nextNewline = text.indexOf("\n", span.start);
  const lineEnd = nextNewline === -1 ? text.length : nextNewline;
  return { from: lineStart, to: lineEnd };
}

export function diagnosticsToLint(
  text: string,
  diagnostics: readonly Diagnostic[],
): LintDiagnostic[] {
  const results: LintDiagnostic[] = [];

  for (const diagnostic of diagnostics) {
    const location = sourceLocation(text, diagnostic.dslSpan);
    if (location === undefined) {
      continue;
    }

    const { from, to } = location.start === text.length
      ? { from: text.length, to: text.length }
      : expandSpanToLine(text, location);

    results.push({
      from,
      to: Math.min(text.length, Math.max(from, to)),
      severity: diagnostic.severity,
      message: `Line ${location.line}, column ${location.column}: ${diagnostic.message}`,
    });
  }

  return results;
}

export const dslLintCompartment = new Compartment();

export function createDslLinter(diagnostics: readonly Diagnostic[]): Extension {
  return linter((view) => diagnosticsToLint(view.state.doc.toString(), diagnostics));
}

export function createInitialDslLintExtension(diagnostics: readonly Diagnostic[]): Extension {
  return dslLintCompartment.of(createDslLinter(diagnostics));
}

export function reconfigureDslLint(diagnostics: readonly Diagnostic[]) {
  return dslLintCompartment.reconfigure(createDslLinter(diagnostics));
}
