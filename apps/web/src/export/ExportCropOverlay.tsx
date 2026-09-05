import { useCallback, useRef, type PointerEvent } from "react";
import { normalizeCrop, type ExportRect } from "./exportBounds.js";

type HandleId = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

type ExportCropOverlayProps = {
  bounds: ExportRect;
  crop: ExportRect;
  scale: number;
  onChange: (crop: ExportRect) => void;
};

function applyHandle(
  crop: ExportRect,
  handle: HandleId,
  dx: number,
  dy: number,
): ExportRect {
  let { x, y, width, height } = crop;
  if (handle.includes("w")) {
    x += dx;
    width -= dx;
  }
  if (handle.includes("e")) {
    width += dx;
  }
  if (handle.includes("n")) {
    y += dy;
    height -= dy;
  }
  if (handle.includes("s")) {
    height += dy;
  }
  return { x, y, width: Math.max(8, width), height: Math.max(8, height) };
}

const HANDLES: readonly { id: HandleId; className: string }[] = [
  { id: "nw", className: "left-0 top-0 -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize" },
  { id: "n", className: "left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 cursor-ns-resize" },
  { id: "ne", className: "right-0 top-0 translate-x-1/2 -translate-y-1/2 cursor-nesw-resize" },
  { id: "e", className: "right-0 top-1/2 translate-x-1/2 -translate-y-1/2 cursor-ew-resize" },
  { id: "se", className: "right-0 bottom-0 translate-x-1/2 translate-y-1/2 cursor-nwse-resize" },
  { id: "s", className: "bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 cursor-ns-resize" },
  { id: "sw", className: "bottom-0 left-0 -translate-x-1/2 translate-y-1/2 cursor-nesw-resize" },
  { id: "w", className: "left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize" },
];

export function ExportCropOverlay({ bounds, crop, scale, onChange }: ExportCropOverlayProps) {
  const dragRef = useRef<{
    handle: HandleId | "move";
    startX: number;
    startY: number;
    origin: ExportRect;
  } | null>(null);

  const onPointerMove = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current;
      if (drag === null) {
        return;
      }
      const dx = (event.clientX - drag.startX) / scale;
      const dy = (event.clientY - drag.startY) / scale;
      if (drag.handle === "move") {
        onChange(
          normalizeCrop(
            { ...drag.origin, x: drag.origin.x + dx, y: drag.origin.y + dy },
            bounds,
          ),
        );
        return;
      }
      onChange(normalizeCrop(applyHandle(drag.origin, drag.handle, dx, dy), bounds));
    },
    [bounds, onChange, scale],
  );

  const endDrag = useCallback(() => {
    dragRef.current = null;
  }, []);

  const startDrag = (handle: HandleId | "move", event: PointerEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
    dragRef.current = {
      handle,
      startX: event.clientX,
      startY: event.clientY,
      origin: crop,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  return (
    <div
      className="absolute inset-0"
      data-testid="export-crop-overlay"
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      <div
        className="absolute border-2 border-[var(--graphiq-accent)]"
        data-testid="export-crop-rect"
        style={{
          left: (crop.x - bounds.x) * scale,
          top: (crop.y - bounds.y) * scale,
          width: crop.width * scale,
          height: crop.height * scale,
        }}
        onPointerDown={(event) => startDrag("move", event)}
      >
        {HANDLES.map((handle) => (
          <button
            key={handle.id}
            type="button"
            aria-label={`Resize crop ${handle.id}`}
            data-testid={`export-crop-handle-${handle.id}`}
            className={`absolute h-3 w-3 rounded-sm border border-white bg-[var(--graphiq-accent)] ${handle.className}`}
            onPointerDown={(event) => startDrag(handle.id, event)}
          />
        ))}
      </div>
    </div>
  );
}
