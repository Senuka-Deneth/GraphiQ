import { Background, BackgroundVariant } from "@xyflow/react";
import { GRID_COLOR, GRID_GAP } from "./canvasDefaults.js";

export function GraphiqFlowBackground() {
  return (
    <Background
      id="graphiq-grid"
      variant={BackgroundVariant.Lines}
      gap={GRID_GAP}
      color={GRID_COLOR}
    />
  );
}
