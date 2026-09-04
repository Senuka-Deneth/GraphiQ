import { objectClassifierExistsRule } from "./classifier-exists.js";
import { objectLinkTwoInstancesRule } from "./link-two-instances.js";
import { objectNoGeneralizationRule } from "./no-generalization.js";
import { objectSlotKnownFeatureRule } from "./slot-known-feature.js";

export const OBJECT_RULES = [
  objectClassifierExistsRule,
  objectSlotKnownFeatureRule,
  objectNoGeneralizationRule,
  objectLinkTwoInstancesRule,
] as const;
