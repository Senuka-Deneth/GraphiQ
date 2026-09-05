import type { ReactNode } from "react";

const hideButtonClassName =
  "rounded px-1.5 py-0.5 text-xs text-slate-600 hover:bg-slate-100";

type ChromePanelProps = {
  open: boolean;
  onToggle: () => void;
  panelTestId: string;
  toggleTestId: string;
  title: string;
  showLabel: string;
  hideLabel: string;
  collapsedButtonLabel: string;
  collapsedButtonClassName: string;
  expandedClassName: string;
  collapsedClassName: string;
  children: ReactNode;
  role?: "status";
  ariaLive?: "polite";
};

export function ChromePanel({
  open,
  onToggle,
  panelTestId,
  toggleTestId,
  title,
  showLabel,
  hideLabel,
  collapsedButtonLabel,
  collapsedButtonClassName,
  expandedClassName,
  collapsedClassName,
  children,
  role,
  ariaLive,
}: ChromePanelProps) {
  return (
    <>
      {!open ? (
        <button
          type="button"
          data-testid={toggleTestId}
          aria-expanded={false}
          aria-label={showLabel}
          onClick={onToggle}
          className={collapsedButtonClassName}
        >
          {collapsedButtonLabel}
        </button>
      ) : null}
      <div
        className={`graphiq-chrome-transition flex shrink-0 flex-col overflow-hidden ${
          open ? `opacity-100 ${expandedClassName}` : `pointer-events-none opacity-0 ${collapsedClassName}`
        }`}
        data-testid={panelTestId}
        aria-hidden={!open}
        role={role}
        aria-live={ariaLive}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-3 py-1.5">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {title}
          </div>
          <button
            type="button"
            data-testid={open ? toggleTestId : undefined}
            aria-expanded={open}
            aria-label={hideLabel}
            onClick={onToggle}
            className={hideButtonClassName}
          >
            Hide
          </button>
        </div>
        {children}
      </div>
    </>
  );
}
