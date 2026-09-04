import type { UmlModel } from "@graphiq/uml-model";
import { layoutObject } from "./layoutObject.js";
import type { LayoutMode, NotationOverlay } from "./overlay.js";

export async function layoutCommunication(
  model: UmlModel,
  overlay: NotationOverlay,
  mode: LayoutMode,
): Promise<NotationOverlay> {
  return layoutObject(model, overlay, mode);
}

export { measureObjectNode as measureCommunicationNode } from "./layoutObject.js";
