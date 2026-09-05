import type { Diagnostic } from "@graphiq/uml-core";
import { ChromePanel } from "./ChromePanel.js";

type DiagnosticsListProps = {
  diagnostics?: readonly Diagnostic[];
  open: boolean;
};

function severityTextClass(severity: Diagnostic["severity"]): string {
  switch (severity) {
    case "error":
      return "text-[var(--graphiq-error)]";
    case "warning":
      return "text-[var(--graphiq-warning)]";
    default: {
      const unreachable: never = severity;
      return unreachable;
    }
  }
}

export function DiagnosticsList({ diagnostics = [], open }: DiagnosticsListProps) {
  return (
    <ChromePanel
      open={open}
      panelTestId="diagnostics-list"
      title="Diagnostics"
      openClassName="bottom-3 left-3 max-h-48 w-fit max-w-[min(560px,calc(100%-1.5rem))] px-1 pb-1"
      role="status"
      ariaLive="polite"
    >
      {diagnostics.length === 0 ? (
        <p className="graphiq-row text-[var(--graphiq-label-secondary)] hover:bg-transparent">
          No issues
        </p>
      ) : (
        <ul className="min-h-0 overflow-y-auto">
          {diagnostics.map((diagnostic) => (
            <li
              key={diagnostic.id}
              className="graphiq-row items-start py-1 hover:bg-transparent"
              data-rule-id={diagnostic.ruleId}
              data-severity={diagnostic.severity}
            >
              <span className="shrink-0 font-mono text-[11px] leading-5 text-[var(--graphiq-label-secondary)]">
                {diagnostic.ruleId}
              </span>
              <span className={`leading-5 ${severityTextClass(diagnostic.severity)}`}>
                {diagnostic.message}
              </span>
            </li>
          ))}
        </ul>
      )}
    </ChromePanel>
  );
}
