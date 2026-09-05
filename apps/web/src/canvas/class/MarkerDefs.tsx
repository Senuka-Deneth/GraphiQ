import { MARKER_IDS, SVG_MARKERS } from "@graphiq/uml-notation";
import { DEFAULT_EDGE_COLOR } from "../canvasDefaults.js";
import { markerDomId, resolveMarkerFill, resolveMarkerStroke } from "./markerPaint.js";

type MarkerDefsProps = {
  extraColors?: readonly string[];
};

export function MarkerDefs({ extraColors = [] }: MarkerDefsProps) {
  const colors = [DEFAULT_EDGE_COLOR, ...extraColors];

  return (
    <svg aria-hidden="true" className="pointer-events-none absolute h-0 w-0 overflow-hidden">
      <defs>
        {colors.flatMap((color) =>
          MARKER_IDS.map((id) => {
            const marker = SVG_MARKERS[id];
            const domId = markerDomId(id, color);
            return (
              <marker
                key={domId}
                id={domId}
                viewBox={marker.viewBox}
                markerWidth={marker.markerWidth}
                markerHeight={marker.markerHeight}
                refX={marker.refX}
                refY={marker.refY}
                orient={marker.orient}
                markerUnits="strokeWidth"
              >
                <path
                  d={marker.pathD}
                  fill={resolveMarkerFill(marker.fill, color)}
                  stroke={resolveMarkerStroke(marker.stroke, color)}
                  strokeWidth={1}
                />
              </marker>
            );
          }),
        )}
      </defs>
    </svg>
  );
}
