import type { DiagramKind } from "@graphiq/uml-core";
import type { UmlModel } from "@graphiq/uml-model";
import { print } from "./print.js";
import { printSequenceMarkup } from "./printSequenceMarkup.js";

export function printPlantUml(
  kind: DiagramKind,
  model: UmlModel,
  options?: { name?: string },
): string {
  if (kind === "sequence") {
    return printSequenceMarkup(model, options);
  }
  const printed = print(kind, model, { name: options?.name });
  const body = printed.replace(/^diagram[^\n]*\n?/, "").trim();
  const title =
    options?.name !== undefined && options.name.trim().length > 0 ? `title ${options.name.trim()}\n` : "";
  return `@startuml\n${title}${body.length > 0 ? `${body}\n` : ""}@enduml\n`;
}
