import type { UmlModel } from "@graphiq/uml-model";
import { printClassCanonical } from "./printClassCanonical.js";
import { printClassPreserving, type PrintSource } from "./printClassPreserving.js";

export type { PrintSource } from "./printClassPreserving.js";

export function printClass(
  model: UmlModel,
  options?: { name?: string; source?: PrintSource },
): string {
  if (options?.source !== undefined && options.source.ast.kind === "class") {
    return printClassPreserving(model, options.source, { name: options.name });
  }
  return printClassCanonical(model, { name: options?.name });
}
