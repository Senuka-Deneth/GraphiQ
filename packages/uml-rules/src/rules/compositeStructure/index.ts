import type { UmlRule } from "../../types.js";
import { compositeStructureConnectorEndsRule } from "./connector-ends-are-parts-or-ports.js";
import { compositeStructureNoGeneralizationRule } from "./no-generalization-inside-as-connector.js";
import { compositeStructurePortOnClassifierRule } from "./port-on-encapsulated-classifier.js";

export const COMPOSITE_STRUCTURE_RULES: readonly UmlRule[] = [
  compositeStructurePortOnClassifierRule,
  compositeStructureConnectorEndsRule,
  compositeStructureNoGeneralizationRule,
];
