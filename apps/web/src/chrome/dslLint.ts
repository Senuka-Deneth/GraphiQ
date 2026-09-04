import { linter, type Diagnostic as LintDiagnostic } from "@codemirror/lint";
import { Compartment, type Extension } from "@codemirror/state";
import type { Diagnostic } from "@graphiq/uml-core";

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

function diagnosticsToLint(
  text: string,
  diagnostics: readonly Diagnostic[],
): LintDiagnostic[] {
  const results: LintDiagnostic[] = [];

  for (const diagnostic of diagnostics) {
    if (diagnostic.dslSpan === undefined) {
      continue;
    }

    const { from, to } = expandSpanToLine(text, diagnostic.dslSpan);
    if (from >= text.length) {
      continue;
    }

    results.push({
      from,
      to: Math.max(from + 1, Math.min(to, text.length)),
      severity: diagnostic.severity,
      message: `${diagnostic.ruleId}: ${diagnostic.message}`,
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
