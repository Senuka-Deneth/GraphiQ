export type LineStyle = "solid" | "dash";

export type MarkerId =
  | "gen-hollow-triangle"
  | "realize-hollow-triangle"
  | "assoc-open"
  | "agg-hollow-diamond"
  | "comp-filled-diamond"
  | "dep-open"
  | "ext-filled-triangle"
  | "msg-sync-filled"
  | "msg-async-open"
  | "msg-reply-open";

export type SvgMarkerDef = {
  id: MarkerId;
  viewBox: string;
  markerWidth: number;
  markerHeight: number;
  refX: number;
  refY: number;
  orient: "auto";
  markerUnits: "userSpaceOnUse";
  fill: "none" | "currentColor" | "canvas";
  stroke: "currentColor";
  pathD: string;
};

export type RelationshipNotation = {
  lineStyle: LineStyle;
  dashArray?: "6 4";
  sourceMarkerId: MarkerId | null;
  targetMarkerId: MarkerId | null;
  keyword?: string;
};

export type ElementShape =
  | "classifierBox"
  | "note"
  | "constraint"
  | "package"
  | "part"
  | "port"
  | "component"
  | "artifact"
  | "node3d"
  | "profileFrame"
  | "stickFigure"
  | "ellipse"
  | "subjectBoundary"
  | "roundedRect"
  | "filledCircle"
  | "bullseye"
  | "circleWithX"
  | "diamond"
  | "thickBar"
  | "swimlane"
  | "frame"
  | "lifelineHead"
  | "executionSpec"
  | "combinedFragmentFrame"
  | "interactionUseFrame"
  | "destructionX"
  | "timingBand"
  | "plainRect";

export type ElementNotation = {
  shape: ElementShape;
  keyword?: string;
  minWidth?: number;
  minHeight?: number;
  nameItalic?: boolean;
  nameUnderline?: boolean;
};

export type ClassBoxMetrics = {
  minWidth: number;
  minHeight: number;
  nameCompartmentHeight: number;
  rowHeight: number;
  fontFamily: string;
  bodyFontSizePx: number;
  nameFontSizePx: number;
  nameFontWeight: "bold";
  abstractNameItalic: boolean;
};

export type ActorMetrics = {
  width: number;
  height: number;
};

export type UseCaseMetrics = {
  minWidth: number;
  minHeight: number;
};
