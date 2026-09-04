import { getRegisteredRules, registerRule } from "../../registry.js";
import { classCompositionRule } from "./composition.js";
import { classForbiddenElementsRule } from "./forbidden-elements.js";
import { classGeneralizationSameMetaclassRule } from "./generalization.js";
import { classMultiplicitySyntaxRule } from "./multiplicity.js";
import { classRealizationRule } from "./realization.js";

const CLASS_RULES = [
  classGeneralizationSameMetaclassRule,
  classRealizationRule,
  classCompositionRule,
  classMultiplicitySyntaxRule,
  classForbiddenElementsRule,
];

export function registerClassRules(): void {
  const registeredIds = new Set(getRegisteredRules().map((rule) => rule.id));

  for (const rule of CLASS_RULES) {
    if (!registeredIds.has(rule.id)) {
      registerRule(rule);
    }
  }
}
