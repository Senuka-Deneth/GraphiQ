import { useCallback, useState, type ReactNode } from "react";
import {
  DEFAULT_ZOOM,
  GRID_COLOR,
  GRID_GAP,
  MAX_ZOOM,
  MIN_ZOOM,
} from "./canvasDefaults.js";
import { ZoomInIcon, ZoomOutIcon } from "../chrome/icons.js";

type SvgZoomViewportProps = {
  width: number;
  height: number;
  children: ReactNode;
  onWheelZoom?: boolean;
  chrome?: boolean;
};

function clampZoom(zoom: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
}

export function SvgZoomViewport({
  width,
  height,
  children,
  chrome = true,
}: SvgZoomViewportProps) {
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);

  const onWheel = useCallback((event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    const delta = event.deltaY > 0 ? -0.1 : 0.1;
    setZoom((current) => clampZoom(Number((current + delta).toFixed(2))));
  }, []);

  if (!chrome) {
    return (
      <div className="relative h-full w-full overflow-hidden bg-transparent">
        {children}
      </div>
    );
  }

  return (
    <div
      className="relative h-full w-full overflow-auto bg-[var(--color-canvas)]"
      onWheel={onWheel}
    >
      <div
        className="graphiq-island-controls absolute z-10 flex flex-col"
        style={{
          top: "var(--graphiq-right-stack-offset)",
          right: "var(--graphiq-inset)",
        }}
      >
        <button
          type="button"
          aria-label="Zoom in"
          data-testid="svg-zoom-in"
          onClick={() => setZoom((current) => clampZoom(Number((current + 0.25).toFixed(2))))}
          className="graphiq-icon-button"
        >
          <ZoomInIcon />
        </button>
        <div className="h-px bg-[var(--graphiq-hairline)]" />
        <button
          type="button"
          aria-label="Zoom out"
          data-testid="svg-zoom-out"
          onClick={() => setZoom((current) => clampZoom(Number((current - 0.25).toFixed(2))))}
          className="graphiq-icon-button"
        >
          <ZoomOutIcon />
        </button>
      </div>
      <div
        style={{
          width,
          height,
          transform: `scale(${zoom})`,
          transformOrigin: "0 0",
        }}
      >
        {children}
      </div>
    </div>
  );
}

export function SvgSquareGrid({ width, height }: { width: number; height: number }) {
  return (
    <>
      <defs>
        <pattern
          id="graphiq-svg-grid"
          width={GRID_GAP}
          height={GRID_GAP}
          patternUnits="userSpaceOnUse"
        >
          <path
            d={`M ${GRID_GAP} 0 L 0 0 0 ${GRID_GAP}`}
            fill="none"
            stroke={GRID_COLOR}
            strokeWidth={1}
          />
        </pattern>
      </defs>
      <rect width={width} height={height} fill="url(#graphiq-svg-grid)" />
    </>
  );
}
