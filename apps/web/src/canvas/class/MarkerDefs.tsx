import { MARKER_IDS, SVG_MARKERS } from "@graphiq/uml-notation";
import { DEFAULT_EDGE_COLOR } from "../canvasDefaults.js";
import { markerDomId, resolveMarkerFill, resolveMarkerStroke } from "./markerPaint.js";

type MarkerDefsProps = {
  extraColors?: readonly string[];
};

function MarkerNodes({ extraColors = [] }: MarkerDefsProps) {
  const colors = [DEFAULT_EDGE_COLOR, ...extraColors];

  return (
    <>
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
              markerUnits={marker.markerUnits}
              overflow="visible"
            >
              <path
                d={marker.pathD}
                fill={resolveMarkerFill(marker.fill, color)}
                stroke={resolveMarkerStroke(marker.stroke, color)}
                strokeWidth={1}
                strokeLinejoin="miter"
              />
            </marker>
          );
        }),
      )}
    </>
  );
}

export function MarkerDefs({ extraColors = [] }: MarkerDefsProps) {
  return (
    <defs data-uml-marker-host="true">
      <MarkerNodes extraColors={extraColors} />
    </defs>
  );
}

export function FlowMarkerDefs({ extraColors = [] }: MarkerDefsProps) {
  return (
    <svg className="react-flow__marker" aria-hidden="true" data-uml-marker-host="true">
      <defs>
        <MarkerNodes extraColors={extraColors} />
      </defs>
    </svg>
  );
}
