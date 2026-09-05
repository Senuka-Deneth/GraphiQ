import { assertNever } from "@graphiq/uml-core";
import type { DiagramKind } from "@graphiq/uml-core";
import type { UmlModel } from "@graphiq/uml-model";
import { printClass } from "./printClass.js";
import type { PrintSource } from "./printClassPreserving.js";
import { printComponent } from "./printComponent.js";
import { printDeployment } from "./printDeployment.js";
import { printObject } from "./printObject.js";
import { printPackage } from "./printPackage.js";
import { printProfile } from "./printProfile.js";
import { printUseCase } from "./printUseCase.js";
import { printCompositeStructure } from "./printCompositeStructure.js";
import { printCommunication } from "./printCommunication.js";
import { printActivity } from "./printActivity.js";
import { printStateMachine } from "./printStateMachine.js";
import { printSequence } from "./printSequence.js";
import { printTiming } from "./printTiming.js";
import { printInteractionOverview } from "./printInteractionOverview.js";

export type { PrintSource } from "./printClassPreserving.js";

export type PrintOptions = {
  source?: PrintSource;
  name?: string;
};

export function print(kind: DiagramKind, model: UmlModel, options?: PrintOptions): string {
  switch (kind) {
    case "class":
      return printClass(model, { name: options?.name, source: options?.source });
    case "object":
      return printObject(model, { name: options?.name });
    case "package":
      return printPackage(model, { name: options?.name });
    case "component":
      return printComponent(model, { name: options?.name });
    case "deployment":
      return printDeployment(model, { name: options?.name });
    case "profile":
      return printProfile(model, { name: options?.name });
    case "useCase":
      return printUseCase(model, { name: options?.name });
    case "compositeStructure":
      return printCompositeStructure(model, { name: options?.name });
    case "communication":
      return printCommunication(model, { name: options?.name });
    case "activity":
      return printActivity(model, { name: options?.name });
    case "stateMachine":
      return printStateMachine(model, { name: options?.name });
    case "sequence":
      return printSequence(model, { name: options?.name });
    case "timing":
      return printTiming(model, { name: options?.name });
    case "interactionOverview":
      return printInteractionOverview(model, { name: options?.name });
    default:
      return assertNever(kind);
  }
}
