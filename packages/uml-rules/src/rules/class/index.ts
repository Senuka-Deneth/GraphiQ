import type { UmlRule } from "../../types.js";
import { classCompositionRule } from "./composition.js";
import { classDiamondOnlyOnAssocRule } from "./diamond-only-on-assoc.js";
import { classForbiddenElementsRule } from "./forbidden-elements.js";
import { classGeneralizationSameMetaclassRule } from "./generalization.js";
import { classMultiplicitySyntaxRule } from "./multiplicity.js";
import { classRealizationRule } from "./realization.js";

export const CLASS_RULES: readonly UmlRule[] = [
  classGeneralizationSameMetaclassRule,
  classRealizationRule,
  classCompositionRule,
  classMultiplicitySyntaxRule,
  classDiamondOnlyOnAssocRule,
  classForbiddenElementsRule,
];
