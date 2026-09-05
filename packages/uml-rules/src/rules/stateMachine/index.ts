import type { UmlRule } from "../../types.js";
import { stateMachineCompositeHasRegionRule } from "./composite-has-region.js";
import { stateMachineFinalNoOutgoingRule } from "./final-no-outgoing.js";
import { stateMachineInitialOneOutgoingNoTriggerRule } from "./initial-one-outgoing-no-trigger.js";
import { stateMachineNoClassOperationsAsStatesRule } from "./no-class-operations-as-states.js";
import { stateMachineTransitionBetweenVerticesRule } from "./transition-between-vertices.js";

export const STATE_MACHINE_RULES: readonly UmlRule[] = [
  stateMachineTransitionBetweenVerticesRule,
  stateMachineInitialOneOutgoingNoTriggerRule,
  stateMachineFinalNoOutgoingRule,
  stateMachineCompositeHasRegionRule,
  stateMachineNoClassOperationsAsStatesRule,
];
