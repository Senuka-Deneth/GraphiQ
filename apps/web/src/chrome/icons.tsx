import type { ReactNode } from "react";

function Glyph({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 20 20"
      className="h-4 w-4 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export function SidebarToggleIcon() {
  return (
    <Glyph>
      <rect x="2.5" y="3.5" width="15" height="13" rx="2.5" />
      <path d="M8 3.5v13" />
    </Glyph>
  );
}

export function DslIcon() {
  return (
    <Glyph>
      <path d="M7.5 5.5 3.5 10l4 4.5" />
      <path d="M12.5 5.5 16.5 10l-4 4.5" />
    </Glyph>
  );
}

export function DiagnosticsIcon() {
  return (
    <Glyph>
      <path d="M10 3.2 17.6 16H2.4z" />
      <path d="M10 8v3.4" />
      <path d="M10 13.7h.01" />
    </Glyph>
  );
}

export function ZoomInIcon() {
  return (
    <Glyph>
      <path d="M10 5v10" />
      <path d="M5 10h10" />
    </Glyph>
  );
}

export function ZoomOutIcon() {
  return (
    <Glyph>
      <path d="M5 10h10" />
    </Glyph>
  );
}

export function FitViewIcon() {
  return (
    <Glyph>
      <path d="M3 7.5V4a1 1 0 0 1 1-1h3.5" />
      <path d="M17 7.5V4a1 1 0 0 0-1-1h-3.5" />
      <path d="M3 12.5V16a1 1 0 0 0 1 1h3.5" />
      <path d="M17 12.5V16a1 1 0 0 1-1 1h-3.5" />
    </Glyph>
  );
}

export function DownloadIcon() {
  return (
    <Glyph>
      <path d="M10 3v9" />
      <path d="M6.5 8.5 10 12l3.5-3.5" />
      <path d="M3.5 15.5h13" />
    </Glyph>
  );
}

export function ImportIcon() {
  return (
    <Glyph>
      <path d="M10 12V3" />
      <path d="M6.5 6.5 10 3l3.5 3.5" />
      <path d="M3.5 15.5h13" />
    </Glyph>
  );
}

export function ExportIcon() {
  return (
    <Glyph>
      <path d="M4 3.5h8.5L16 7v9.5H4z" />
      <path d="M12.5 3.5V7H16" />
    </Glyph>
  );
}
