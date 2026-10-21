import type { DslSpan } from "../ast.js";

export const SEQUENCE_MARKUP_RULE_ID = "sequence.markup.unsupported";

export type SequenceMarkupParticipantKind =
  | "participant"
  | "actor"
  | "boundary"
  | "control"
  | "entity"
  | "database"
  | "collections"
  | "queue";

export type SequenceMarkupParticipant = {
  kind: SequenceMarkupParticipantKind;
  displayName: string;
  alias?: string;
  span: DslSpan;
};

export type SequenceMarkupMessageSort = "synchCall" | "asynchCall" | "reply";

export type SequenceMarkupActivationMarker = {
  participant: string;
  action: "activate" | "deactivate";
};

export type SequenceMarkupMessage = {
  itemKind: "message";
  source: string;
  target: string;
  messageSort: SequenceMarkupMessageSort;
  label?: string;
  activations: SequenceMarkupActivationMarker[];
  span: DslSpan;
};

export type SequenceMarkupActivation = {
  itemKind: "activate" | "deactivate";
  participant: string;
  span: DslSpan;
};

export type SequenceMarkupNote = {
  itemKind: "note";
  placement: "left" | "right" | "over";
  participants: string[];
  text: string;
  span: DslSpan;
};

export type SequenceMarkupGroupOperator = "alt" | "opt" | "loop" | "par";

export type SequenceMarkupOperand = {
  guard?: string;
  items: SequenceMarkupItem[];
};

export type SequenceMarkupGroup = {
  itemKind: "group";
  operator: SequenceMarkupGroupOperator;
  operands: SequenceMarkupOperand[];
  span: DslSpan;
};

export type SequenceMarkupItem =
  | SequenceMarkupMessage
  | SequenceMarkupActivation
  | SequenceMarkupNote
  | SequenceMarkupGroup;

export type SequenceMarkupDocument = {
  title?: string;
  participants: SequenceMarkupParticipant[];
  items: SequenceMarkupItem[];
  span: DslSpan;
};
