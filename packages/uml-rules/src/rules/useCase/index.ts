import type { UmlRule } from "../../types.js";
import { useCaseAssocActorToUseCaseRule } from "./assoc-actor-to-usecase.js";
import { useCaseExtendDirectionRule } from "./extend-direction.js";
import { useCaseExtendUseCaseToUseCaseRule } from "./extend-usecase-to-usecase.js";
import { useCaseGenActorOrUseCaseRule } from "./gen-actor-or-usecase.js";
import { useCaseIncludeUseCaseToUseCaseRule } from "./include-usecase-to-usecase.js";
import { useCaseNoClassAttributesRule } from "./no-class-attributes.js";

export const USE_CASE_RULES: readonly UmlRule[] = [
  useCaseAssocActorToUseCaseRule,
  useCaseIncludeUseCaseToUseCaseRule,
  useCaseExtendUseCaseToUseCaseRule,
  useCaseExtendDirectionRule,
  useCaseGenActorOrUseCaseRule,
  useCaseNoClassAttributesRule,
];
