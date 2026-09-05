import { assertNever } from "@graphiq/uml-core";
import type { DiagramKind } from "@graphiq/uml-core";
import type { UmlModel } from "@graphiq/uml-model";
import { layoutClass } from "./layoutClass.js";
import { layoutComponent } from "./layoutComponent.js";
import { layoutDeployment } from "./layoutDeployment.js";
import { layoutObject } from "./layoutObject.js";
import { layoutPackage } from "./layoutPackage.js";
import { layoutProfile } from "./layoutProfile.js";
import { layoutUseCase } from "./layoutUseCase.js";
import { layoutCompositeStructure } from "./layoutCompositeStructure.js";
import { layoutCommunication } from "./layoutCommunication.js";
import { layoutActivity } from "./layoutActivity.js";
import { layoutStateMachine } from "./layoutStateMachine.js";
import { layoutSequence } from "./layoutSequence.js";
import { layoutTiming } from "./layoutTiming.js";
import { layoutInteractionOverview } from "./layoutInteractionOverview.js";
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
    case "deployment":
      return layoutDeployment(model, overlay, mode);
    case "profile":
      return layoutProfile(model, overlay, mode);
    case "useCase":
      return layoutUseCase(model, overlay, mode);
    case "compositeStructure":
      return layoutCompositeStructure(model, overlay, mode);
    case "communication":
      return layoutCommunication(model, overlay, mode);
    case "activity":
      return layoutActivity(model, overlay, mode);
    case "stateMachine":
      return layoutStateMachine(model, overlay, mode);
    case "sequence":
      return layoutSequence(model, overlay, mode);
    case "timing":
      return layoutTiming(model, overlay, mode);
    case "interactionOverview":
      return layoutInteractionOverview(model, overlay, mode);
    default:
      return assertNever(kind);
  }
}
