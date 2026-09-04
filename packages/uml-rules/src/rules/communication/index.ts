import type { UmlRule } from "../../types.js";
import { communicationMessageHasSequenceNumberRule } from "./message-has-sequence-number.js";
import { communicationNoLifelineDashesRule } from "./no-lifeline-dashes.js";
import { communicationNumberUniqueRule } from "./number-unique-in-interaction.js";

export const COMMUNICATION_RULES: readonly UmlRule[] = [
  communicationMessageHasSequenceNumberRule,
  communicationNumberUniqueRule,
  communicationNoLifelineDashesRule,
];
