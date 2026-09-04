import { assertNever } from "@graphiq/uml-core";
import type { DiagramKind } from "@graphiq/uml-core";
import type { UmlModel } from "@graphiq/uml-model";
import { layoutClass } from "./layoutClass.js";
import { layoutComponent } from "./layoutComponent.js";
import { layoutObject } from "./layoutObject.js";
import { layoutPackage } from "./layoutPackage.js";
import type { NotationOverlay, RelayoutReason } from "./overlay.js";
import { reasonToLayoutMode } from "./overlay.js";

export async function layoutDocument(
  kind: DiagramKind,
  model: UmlModel,
  overlay: NotationOverlay,
  reason: RelayoutReason,
): Promise<NotationOverlay> {
  const mode = reasonToLayoutMode(reason);

  switch (kind) {
    case "class":
      return layoutClass(model, overlay, mode);
    case "object":
      return layoutObject(model, overlay, mode);
    case "package":
      return layoutPackage(model, overlay, mode);
    case "component":
      return layoutComponent(model, overlay, mode);
    case "compositeStructure":
    case "deployment":
    case "profile":
    case "useCase":
    case "activity":
    case "stateMachine":
    case "sequence":
    case "communication":
    case "timing":
    case "interactionOverview":
      throw new Error(`layout not implemented for ${kind}`);
    default:
      return assertNever(kind);
  }
}
