import type { Diagnostic } from "@graphiq/uml-core";

type DiagnosticsListProps = {
  diagnostics?: readonly Diagnostic[];
};

function severityTextClass(severity: Diagnostic["severity"]): string {
  switch (severity) {
    case "error":
      return "text-red-700";
    case "warning":
      return "text-amber-700";
    default:
      return "text-slate-800";
  }
}

export function DiagnosticsList({ diagnostics = [] }: DiagnosticsListProps) {
  return (
    <section
      className="flex max-h-36 min-h-24 shrink-0 flex-col border-t border-slate-300 bg-white"
      data-testid="diagnostics-list"
      aria-label="Diagnostics"
    >
      <div className="border-b border-slate-200 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
        Diagnostics
      </div>
      {diagnostics.length === 0 ? (
        <p className="px-3 py-2 text-sm text-slate-500">No issues</p>
      ) : (
        <ul className="overflow-y-auto px-3 py-2">
          {diagnostics.map((diagnostic) => (
            <li
              key={diagnostic.id}
              className="border-b border-slate-100 py-1 text-sm last:border-b-0"
              data-rule-id={diagnostic.ruleId}
              data-severity={diagnostic.severity}
            >
              <span className="font-mono text-xs text-slate-500">{diagnostic.ruleId}</span>
              <span className={`ml-2 ${severityTextClass(diagnostic.severity)}`}>
                {diagnostic.message}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
