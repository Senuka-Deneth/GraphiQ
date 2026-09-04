import type { UmlRule } from "../../types.js";
import { sequenceAsyncNotFilledArrowRule } from "./async-not-filled-arrow.js";
import { sequenceCombinedFragmentOperandsNonemptyRule } from "./combined-fragment-operands-nonempty.js";
import { sequenceCreateTargetIsLifelineRule } from "./create-target-is-lifeline.js";
import { sequenceExecutionNestedProperlyRule } from "./execution-nested-properly.js";
import { sequenceMessageBetweenLifelinesOrGatesRule } from "./message-between-lifelines-or-gates.js";
import { sequenceNoClassCompartmentsOnLifelineHeadRule } from "./no-class-compartments-on-lifeline-head.js";
import { sequenceReplyMatchesSynchCallRule } from "./reply-matches-synch-call.js";

export const SEQUENCE_RULES: readonly UmlRule[] = [
  sequenceMessageBetweenLifelinesOrGatesRule,
  sequenceReplyMatchesSynchCallRule,
  sequenceAsyncNotFilledArrowRule,
  sequenceExecutionNestedProperlyRule,
  sequenceCombinedFragmentOperandsNonemptyRule,
  sequenceCreateTargetIsLifelineRule,
  sequenceNoClassCompartmentsOnLifelineHeadRule,
];
