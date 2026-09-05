import type { Diagnostic } from "@graphiq/uml-core";
import { ChromePanel } from "./ChromePanel.js";

type DiagnosticsListProps = {
  diagnostics?: readonly Diagnostic[];
  open: boolean;
  onToggle: () => void;
};

function severityTextClass(severity: Diagnostic["severity"]): string {
  switch (severity) {
    case "error":
      return "text-red-700";
    case "warning":
      return "text-amber-700";
    default: {
      const unreachable: never = severity;
      return unreachable;
    }
  }
}

export function DiagnosticsList({
  diagnostics = [],
  open,
  onToggle,
}: DiagnosticsListProps) {
  const errorCount = diagnostics.filter((diagnostic) => diagnostic.severity === "error").length;

  return (
    <ChromePanel
      open={open}
      onToggle={onToggle}
      panelTestId="diagnostics-list"
      toggleTestId="diagnostics-toggle"
      title="Diagnostics"
      showLabel={
        errorCount > 0 ? `Show diagnostics, ${errorCount} errors` : "Show diagnostics"
      }
      hideLabel="Hide diagnostics"
      collapsedButtonLabel={errorCount > 0 ? `Diagnostics (${errorCount})` : "Diagnostics"}
      collapsedButtonClassName="absolute bottom-3 left-1/2 z-20 -translate-x-1/2 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 shadow-sm hover:bg-slate-50"
      expandedClassName="max-h-36 min-h-24 border-t border-slate-300 bg-white"
      collapsedClassName="max-h-0 min-h-0"
      role="status"
      ariaLive="polite"
    >
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
    </ChromePanel>
  );
}
