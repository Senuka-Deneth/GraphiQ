import { MARKER_IDS, SVG_MARKERS } from "@graphiq/uml-notation";

export function MarkerDefs() {
  return (
    <svg aria-hidden="true" className="pointer-events-none absolute h-0 w-0 overflow-hidden">
      <defs>
        {MARKER_IDS.map((id) => {
          const marker = SVG_MARKERS[id];
          return (
            <marker
              key={id}
              id={id}
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
                fill={marker.fill}
                stroke={marker.stroke}
                strokeWidth={1}
              />
            </marker>
          );
        })}
      </defs>
    </svg>
  );
}
