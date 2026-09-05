import type { UmlRule } from "../../types.js";
import { timingIntervalsNonOverlappingRule } from "./intervals-non-overlapping-per-lifeline.js";
import { timingMessageAtSharedTimeRule } from "./message-at-shared-time.js";
import { timingNoClassOperationsCompartmentRule } from "./no-class-operations-compartment.js";
import { timingStateBelongsToLifelineRule } from "./state-belongs-to-lifeline.js";

export const TIMING_RULES: readonly UmlRule[] = [
  timingStateBelongsToLifelineRule,
  timingIntervalsNonOverlappingRule,
  timingMessageAtSharedTimeRule,
  timingNoClassOperationsCompartmentRule,
];
