import type { UmlRule } from "../../types.js";
import { interactionOverviewFlowActivityLikeRule } from "./flow-activity-like.js";
import { interactionOverviewNoRawMessagesOutsideRefRule } from "./no-raw-messages-outside-ref.js";
import { interactionOverviewRefNamesAnInteractionRule } from "./ref-names-an-interaction.js";

export const INTERACTION_OVERVIEW_RULES: readonly UmlRule[] = [
  interactionOverviewRefNamesAnInteractionRule,
  interactionOverviewFlowActivityLikeRule,
  interactionOverviewNoRawMessagesOutsideRefRule,
];
