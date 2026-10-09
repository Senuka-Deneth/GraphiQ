import type { Diagnostic } from "@graphiq/uml-core";
import { ChromePanel } from "./ChromePanel.js";
import { sourceLocation } from "../diagnostics/sourceLocation.js";

type DiagnosticsListProps = {
  diagnostics?: readonly Diagnostic[];
  open: boolean;
  source?: string;
  onNavigate?: (span: { start: number; end: number }) => void;
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

export function DiagnosticsList({ diagnostics = [], open, source = "", onNavigate }: DiagnosticsListProps) {
  return (
    <ChromePanel
      open={open}
      panelTestId="diagnostics-list"
      title="Diagnostics"
      openClassName="bottom-3 left-3 max-h-64 w-fit max-w-[min(560px,calc(100%-1.5rem))] px-1 pb-1"
      role="status"
      ariaLive="polite"
    >
      {diagnostics.length === 0 ? (
        <p className="graphiq-row text-[var(--graphiq-label-secondary)] hover:bg-transparent">
          No issues
        </p>
      ) : (
        <ul className="min-h-0 overflow-y-auto">
          {diagnostics.map((diagnostic) => {
            const location = sourceLocation(source, diagnostic.dslSpan);
            return (
              <li
                key={diagnostic.id}
                className="graphiq-row flex-col items-start gap-1 py-2 hover:bg-transparent"
                data-rule-id={diagnostic.ruleId}
                data-severity={diagnostic.severity}
              >
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-[var(--graphiq-label-secondary)]">
                  <span>{diagnostic.severity === "error" ? "Error" : "Warning"}</span>
                  {location !== undefined && onNavigate !== undefined ? (
                    <button type="button" className="cursor-pointer underline underline-offset-2"
                      onClick={() => onNavigate(location)}>
                      Line {location.line}, column {location.column}
                    </button>
                  ) : location !== undefined ? (
                    <span>Line {location.line}, column {location.column}</span>
                  ) : null}
                  <span className="font-mono">{diagnostic.ruleId}</span>
                </div>
                <span className={`break-words whitespace-pre-wrap leading-5 ${severityTextClass(diagnostic.severity)}`}>
                  {diagnostic.message}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </ChromePanel>
  );
}
