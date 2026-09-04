import { assertNever } from "@graphiq/uml-core";
import type { DiagramKind } from "@graphiq/uml-core";
import type { UmlModel } from "@graphiq/uml-model";
import { printClass } from "./printClass.js";
import { printComponent } from "./printComponent.js";
import { printDeployment } from "./printDeployment.js";
import { printObject } from "./printObject.js";
import { printPackage } from "./printPackage.js";
import { printProfile } from "./printProfile.js";
import { printUseCase } from "./printUseCase.js";
import { printCompositeStructure } from "./printCompositeStructure.js";

export type PrintOptions = {
  cst?: unknown;
  name?: string;
};

export function print(kind: DiagramKind, model: UmlModel, options?: PrintOptions): string {
  switch (kind) {
    case "class":
      return printClass(model, { name: options?.name });
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
    case "activity":
    case "stateMachine":
    case "sequence":
    case "communication":
    case "timing":
    case "interactionOverview":
      throw new Error(`not implemented`);
    default:
      return assertNever(kind);
  }
}
