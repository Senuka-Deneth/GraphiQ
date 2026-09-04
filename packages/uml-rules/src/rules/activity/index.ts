import type { UmlRule } from "../../types.js";
import { activityDecisionHasGuardsOnOutgoingRule } from "./decision-has-guards-on-outgoing.js";
import { activityFinalNoOutgoingRule } from "./final-no-outgoing.js";
import { activityFlowFromExecutableOrControlNodeRule } from "./flow-from-executable-or-control-node.js";
import { activityForkJoinBalanceRule } from "./fork-join-balance.js";
import { activityInitialNoIncomingRule } from "./initial-no-incoming.js";
import { activityNoClassesAsActionsRule } from "./no-classes-as-actions.js";

export const ACTIVITY_RULES: readonly UmlRule[] = [
  activityFlowFromExecutableOrControlNodeRule,
  activityInitialNoIncomingRule,
  activityFinalNoOutgoingRule,
  activityDecisionHasGuardsOnOutgoingRule,
  activityForkJoinBalanceRule,
  activityNoClassesAsActionsRule,
];
