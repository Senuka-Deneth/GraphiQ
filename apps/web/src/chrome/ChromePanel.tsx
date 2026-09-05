import type { ReactNode } from "react";

type ChromePanelProps = {
  open: boolean;
  panelTestId: string;
  title: string;
  /** Geometry of the open island: position, width, height. */
  openClassName: string;
  children: ReactNode;
  role?: "status";
  ariaLive?: "polite";
};

/**
 * A floating chrome island over the canvas. The panel stays mounted while
 * closed (CodeMirror must survive a collapse) but collapses to a zero-size,
 * non-interactive box so nothing inside it is focusable or hit-testable.
 *
 * Panels do not own their toggle. The persistent corner buttons in
 * `EditorShell` are the single toggle for each panel.
 */
export function ChromePanel({
  open,
  panelTestId,
  title,
  openClassName,
  children,
  role,
  ariaLive,
}: ChromePanelProps) {
  return (
    <div
      className={`graphiq-chrome-transition absolute z-20 flex flex-col overflow-hidden ${
        open
          ? `graphiq-island opacity-100 ${openClassName}`
          : "h-0 w-0 border-0 p-0 opacity-0 pointer-events-none"
      }`}
      data-testid={panelTestId}
      aria-hidden={!open}
      role={role}
      aria-live={ariaLive}
    >
      <div className="graphiq-section-label flex h-6 shrink-0 items-center">{title}</div>
      {children}
    </div>
  );
}
