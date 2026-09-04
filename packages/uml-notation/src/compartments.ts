import type { ActorMetrics, ClassBoxMetrics, UseCaseMetrics } from "./types.js";

export const DASH_ARRAY = "6 4" as const;

export const CLASS_BOX: ClassBoxMetrics = {
  minWidth: 180,
  minHeight: 72,
  nameCompartmentHeight: 32,
  rowHeight: 20,
  fontFamily: "Inter, system-ui, sans-serif",
  bodyFontSizePx: 12,
  nameFontSizePx: 13,
  nameFontWeight: "bold",
  abstractNameItalic: true,
};

export const ACTOR: ActorMetrics = {
  width: 24,
  height: 40,
};

export const USE_CASE: UseCaseMetrics = {
  minWidth: 140,
  minHeight: 70,
};
