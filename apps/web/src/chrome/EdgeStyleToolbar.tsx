import type { MarkerId } from "@graphiq/uml-notation";
import { DEFAULT_EDGE_COLOR, DEFAULT_STROKE_WIDTH } from "../canvas/canvasDefaults.js";
import { useDocumentStore, type ImplementedDiagramKind } from "../store/documentStore.js";
import {
  findToolForNotation,
  notationForRelationship,
  ROUTE_STYLES,
  uniqueMarkers,
} from "./edgeStyleOptions.js";

type EdgeStyleToolbarProps = {
  relationshipId: string;
  diagramKind: ImplementedDiagramKind;
};

function markerLabel(marker: MarkerId | null): string {
  if (marker === null) {
    return "None";
  }
  switch (marker) {
    case "gen-hollow-triangle":
    case "realize-hollow-triangle":
      return "Hollow triangle";
    case "assoc-open":
    case "dep-open":
    case "msg-async-open":
    case "msg-reply-open":
      return "Open";
    case "agg-hollow-diamond":
      return "Hollow diamond";
    case "comp-filled-diamond":
      return "Filled diamond";
    case "ext-filled-triangle":
    case "msg-sync-filled":
      return "Filled triangle";
    default: {
      const unreachable: never = marker;
      return String(unreachable);
    }
  }
}

export function EdgeStyleToolbar({ relationshipId, diagramKind }: EdgeStyleToolbarProps) {
  const relationship = useDocumentStore((state) =>
    state.document.model.relationships.find((item) => item.id === relationshipId),
  );
  const overlayEdge = useDocumentStore(
    (state) => state.document.overlay.edges[relationshipId],
  );
  const updateEdgeOverlay = useDocumentStore((state) => state.updateEdgeOverlay);
  const changeSelectedRelationshipType = useDocumentStore(
    (state) => state.changeSelectedRelationshipType,
  );
  const reverseSelectedRelationship = useDocumentStore(
    (state) => state.reverseSelectedRelationship,
  );

  if (relationship === undefined) {
    return null;
  }

  const notation = notationForRelationship(diagramKind, relationship);
  const routeStyle = overlayEdge?.routeStyle ?? "orthogonal";
  const strokeColor = overlayEdge?.strokeColor ?? DEFAULT_EDGE_COLOR;
  const strokeWidth = overlayEdge?.strokeWidth ?? DEFAULT_STROKE_WIDTH;
  const startMarkers = uniqueMarkers(diagramKind, "source");
  const endMarkers = uniqueMarkers(diagramKind, "target");

  return (
    <div
      className="pointer-events-auto absolute bottom-14 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 shadow-md"
      data-testid="edge-style-toolbar"
    >
      {ROUTE_STYLES.map((route) => (
        <button
          key={route.id}
          type="button"
          aria-label={route.label}
          aria-pressed={routeStyle === route.id}
          data-route-style={route.id}
          onClick={() => updateEdgeOverlay(relationshipId, { routeStyle: route.id })}
          className={`rounded px-2 py-1 text-xs ${
            routeStyle === route.id
              ? "bg-slate-900 text-white"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          {route.label}
        </button>
      ))}
      <label className="ml-1 flex items-center" aria-label="Line color">
        <input
          type="color"
          data-testid="edge-color"
          value={strokeColor}
          onChange={(event) =>
            updateEdgeOverlay(relationshipId, { strokeColor: event.target.value })
          }
          className="h-6 w-6 cursor-pointer rounded-full border border-slate-300 bg-white p-0"
        />
      </label>
      <label className="flex items-center gap-1 text-xs text-slate-600">
        <span className="sr-only">Line width</span>
        <input
          type="number"
          min={1}
          max={8}
          step={1}
          data-testid="edge-stroke-width"
          value={strokeWidth}
          onChange={(event) =>
            updateEdgeOverlay(relationshipId, {
              strokeWidth: Number(event.target.value),
            })
          }
          className="w-14 rounded border border-slate-300 px-1 py-0.5 text-xs"
        />
        <span>px</span>
      </label>
      <select
        aria-label="Line style"
        data-testid="edge-line-style"
        value={notation.lineStyle}
        onChange={(event) => {
          const next = findToolForNotation(diagramKind, notation, {
            lineStyle: event.target.value === "dash" ? "dash" : "solid",
          });
          void changeSelectedRelationshipType(relationshipId, next);
        }}
        className="rounded border border-slate-300 px-1 py-0.5 text-xs"
      >
        <option value="solid">Solid</option>
        <option value="dash">Dashed</option>
      </select>
      <select
        aria-label="Start arrowhead"
        data-testid="edge-start-head"
        value={notation.sourceMarkerId ?? "none"}
        onChange={(event) => {
          const value = event.target.value;
          const next = findToolForNotation(diagramKind, notation, {
            sourceMarkerId: value === "none" ? null : (value as MarkerId),
          });
          void changeSelectedRelationshipType(relationshipId, next);
        }}
        className="rounded border border-slate-300 px-1 py-0.5 text-xs"
      >
        {startMarkers.map((marker) => (
          <option key={marker ?? "none"} value={marker ?? "none"}>
            {markerLabel(marker)}
          </option>
        ))}
      </select>
      <button
        type="button"
        aria-label="Swap direction"
        data-testid="edge-swap-direction"
        onClick={() => {
          void reverseSelectedRelationship(relationshipId);
        }}
        className="rounded px-2 py-1 text-xs bg-slate-100 text-slate-700 hover:bg-slate-200"
      >
        Swap
      </button>
      <select
        aria-label="End arrowhead"
        data-testid="edge-end-head"
        value={notation.targetMarkerId ?? "none"}
        onChange={(event) => {
          const value = event.target.value;
          const next = findToolForNotation(diagramKind, notation, {
            targetMarkerId: value === "none" ? null : (value as MarkerId),
          });
          void changeSelectedRelationshipType(relationshipId, next);
        }}
        className="rounded border border-slate-300 px-1 py-0.5 text-xs"
      >
        {endMarkers.map((marker) => (
          <option key={marker ?? "none"} value={marker ?? "none"}>
            {markerLabel(marker)}
          </option>
        ))}
      </select>
    </div>
  );
}
