import type { UmlRule } from "../../types.js";
import { componentAssemblyProvidedToRequiredRule } from "./assembly-provided-to-required.js";
import { componentDelegationSameComponentRule } from "./delegation-same-component.js";
import { componentNoActorRule } from "./no-actor.js";
import { componentProvidedIsInterfaceRule } from "./provided-is-interface.js";
import { componentRequiredIsInterfaceRule } from "./required-is-interface.js";

export const COMPONENT_RULES: readonly UmlRule[] = [
  componentProvidedIsInterfaceRule,
  componentRequiredIsInterfaceRule,
  componentAssemblyProvidedToRequiredRule,
  componentDelegationSameComponentRule,
  componentNoActorRule,
];
