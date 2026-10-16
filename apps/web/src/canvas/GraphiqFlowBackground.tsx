import { Background, BackgroundVariant } from "@xyflow/react";
import { GRID_COLOR, GRID_GAP } from "./canvasDefaults.js";

export function GraphiqFlowBackground() {
  return (
    <Background
      id="graphiq-grid"
      variant={BackgroundVariant.Dots}
      gap={GRID_GAP}
      size={1}
      color={GRID_COLOR}
    />
  );
}
