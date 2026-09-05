import type { ReactNode } from "react";

function IconFrame({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7 text-slate-800" aria-hidden="true">
      {children}
    </svg>
  );
}

export function StencilShapeIcon({ id }: { id: string }) {
  switch (id) {
    case "text":
      return (
        <IconFrame>
          <text x="6" y="18" fontSize="16" fontFamily="serif" fill="currentColor">
            T
          </text>
        </IconFrame>
      );
    case "note":
      return (
        <IconFrame>
          <path
            d="M6 5h9l4 4v10H6z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path d="M15 5v4h4" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </IconFrame>
      );
    case "actor":
      return (
        <IconFrame>
          <circle cx="12" cy="6" r="2.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d="M12 8.5v6M8 11h8M9 20l3-5.5L15 20" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </IconFrame>
      );
    case "useCase":
      return (
        <IconFrame>
          <ellipse cx="12" cy="12" rx="8" ry="5" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </IconFrame>
      );
    case "decisionNode":
    case "choice":
    case "mergeNode":
      return (
        <IconFrame>
          <path d="M12 4l8 8-8 8-8-8z" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </IconFrame>
      );
    case "initial":
    case "initialNode":
      return (
        <IconFrame>
          <circle cx="12" cy="12" r="5" fill="currentColor" />
        </IconFrame>
      );
    case "final":
    case "activityFinalNode":
      return (
        <IconFrame>
          <circle cx="12" cy="12" r="7" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="12" cy="12" r="4" fill="currentColor" />
        </IconFrame>
      );
    default:
      return (
        <IconFrame>
          <rect
            x="5"
            y="6"
            width="14"
            height="12"
            rx="1"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path d="M5 10h14" stroke="currentColor" strokeWidth="1.5" />
        </IconFrame>
      );
  }
}

export function ConnectorToolIcon({ id }: { id: string }) {
  switch (id) {
    case "generalization":
    case "realization":
      return (
        <IconFrame>
          <path d="M4 12h12" stroke="currentColor" strokeWidth="1.5" fill="none" />
          <path d="M16 8l5 4-5 4z" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </IconFrame>
      );
    case "composition":
      return (
        <IconFrame>
          <path d="M10 12h10" stroke="currentColor" strokeWidth="1.5" />
          <path d="M4 12l3-3 3 3-3 3z" fill="currentColor" />
        </IconFrame>
      );
    case "aggregation":
      return (
        <IconFrame>
          <path d="M10 12h10" stroke="currentColor" strokeWidth="1.5" />
          <path d="M4 12l3-3 3 3-3 3z" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </IconFrame>
      );
    case "dependency":
    case "include":
    case "extend":
    case "usage":
    case "packageImport":
    case "packageMerge":
    case "deployment":
    case "reply":
      return (
        <IconFrame>
          <path d="M4 12h14" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 2" />
          <path d="M16 8l5 4-5 4" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </IconFrame>
      );
    default:
      return (
        <IconFrame>
          <path d="M4 12h14" stroke="currentColor" strokeWidth="1.5" />
          <path d="M16 8l5 4-5 4" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </IconFrame>
      );
  }
}
