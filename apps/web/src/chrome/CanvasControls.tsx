import { Panel, useReactFlow } from "@xyflow/react";
import { FitViewIcon, ZoomInIcon, ZoomOutIcon } from "./icons.js";

/**
 * Zoom and fit controls, styled as Apple-Maps corner islands. Rendered inside
 * `ReactFlow` because it needs the flow instance, and offset down the right
 * edge by the shared token so it lines up under the panel toggles that
 * `EditorShell` renders outside the canvas.
 */
export function CanvasControls() {
  const { zoomIn, zoomOut, fitView } = useReactFlow();

  return (
    <Panel
      position="top-right"
      className="flex flex-col items-end gap-2"
      style={{
        marginTop: "var(--graphiq-right-stack-offset)",
        marginRight: "var(--graphiq-inset)",
      }}
    >
      <div className="graphiq-island-controls flex flex-col">
        <button
          type="button"
          className="graphiq-icon-button"
          aria-label="Zoom in"
          data-testid="flow-zoom-in"
          onClick={() => zoomIn()}
        >
          <ZoomInIcon />
        </button>
        <div className="h-px bg-[var(--graphiq-hairline)]" />
        <button
          type="button"
          className="graphiq-icon-button"
          aria-label="Zoom out"
          data-testid="flow-zoom-out"
          onClick={() => zoomOut()}
        >
          <ZoomOutIcon />
        </button>
      </div>
      <div className="graphiq-island-controls flex flex-col">
        <button
          type="button"
          className="graphiq-icon-button"
          aria-label="Fit view"
          data-testid="flow-fit-view"
          onClick={() => fitView({ padding: 0.2 })}
        >
          <FitViewIcon />
        </button>
      </div>
    </Panel>
  );
}
