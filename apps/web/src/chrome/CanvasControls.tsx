import { CanvasControlPortal } from "./CanvasControlPortal.js";
import { useReactFlow } from "@xyflow/react";
import { FitViewIcon, ZoomInIcon, ZoomOutIcon } from "./icons.js";

/**
 * Zoom and fit controls, styled as compact corner groups. Rendered inside
 * `ReactFlow` because it needs the flow instance, and offset down the right
 * edge by the shared token so it lines up under the panel toggles that
 * `EditorShell` renders outside the canvas.
 */
export function CanvasControls() {
  const { zoomIn, zoomOut, fitView } = useReactFlow();

  return (
    <CanvasControlPortal>
      <div className="flex flex-col items-end gap-2">
        <button
          type="button"
          className="graphiq-glass-button graphiq-expand-button"
          aria-label="Zoom in"
          data-testid="flow-zoom-in"
          onClick={() => zoomIn()}
        >
          <ZoomInIcon /><span className="graphiq-button-label">Zoom in</span>
        </button>
        <button
          type="button"
          className="graphiq-glass-button graphiq-expand-button"
          aria-label="Zoom out"
          data-testid="flow-zoom-out"
          onClick={() => zoomOut()}
        >
          <ZoomOutIcon /><span className="graphiq-button-label">Zoom out</span>
        </button>
      </div>
      <div className="flex flex-col items-end gap-2">
        <button
          type="button"
          className="graphiq-glass-button graphiq-expand-button"
          aria-label="Fit view"
          data-testid="flow-fit-view"
          onClick={() => fitView({ padding: 0.2 })}
        >
          <FitViewIcon /><span className="graphiq-button-label">Fit view</span>
        </button>
      </div>
    </CanvasControlPortal>
  );
}
