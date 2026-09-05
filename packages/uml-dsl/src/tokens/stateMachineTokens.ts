import { createToken, Lexer } from "chevrotain";

export const WhiteSpace = createToken({
  name: "WhiteSpace",
  pattern: /\s+/,
  group: Lexer.SKIPPED,
});

export const LineComment = createToken({
  name: "LineComment",
  pattern: /\/\/[^\n\r]*/,
  group: "comments",
});

export const BlockComment = createToken({
  name: "BlockComment",
  pattern: /\/\*[\s\S]*?\*\//,
  group: "comments",
});

export const TransitionArrow = createToken({
  name: "TransitionArrow",
  pattern: /-->/,
});

export const StarVertex = createToken({
  name: "StarVertex",
  pattern: /\[\s*\*\s*\]/,
});

export const DiagramKeyword = createToken({
  name: "DiagramKeyword",
  pattern: /diagram/,
});

export const StateMachineKeyword = createToken({
  name: "StateMachineKeyword",
  pattern: /stateMachine/,
});

export const StateKeyword = createToken({
  name: "StateKeyword",
  pattern: /state/,
});

export const RegionKeyword = createToken({
  name: "RegionKeyword",
  pattern: /region/,
});

export const ChoiceKeyword = createToken({
  name: "ChoiceKeyword",
  pattern: /choice/,
});

export const JunctionKeyword = createToken({
  name: "JunctionKeyword",
  pattern: /junction/,
});

export const ForkKeyword = createToken({
  name: "ForkKeyword",
  pattern: /fork/,
});

export const JoinKeyword = createToken({
  name: "JoinKeyword",
  pattern: /join/,
});

export const HistoryKeyword = createToken({
  name: "HistoryKeyword",
  pattern: /history/,
});

export const DeepHistoryKeyword = createToken({
  name: "DeepHistoryKeyword",
  pattern: /deepHistory/,
});

export const TerminateKeyword = createToken({
  name: "TerminateKeyword",
  pattern: /terminate/,
});

export const EntryKeyword = createToken({
  name: "EntryKeyword",
  pattern: /entry/,
});

export const DoKeyword = createToken({
  name: "DoKeyword",
  pattern: /do/,
});

export const ExitKeyword = createToken({
  name: "ExitKeyword",
  pattern: /exit/,
});

export const BracketedGuard = createToken({
  name: "BracketedGuard",
  pattern: /\[[^\]]+\]/,
});

export const Identifier = createToken({
  name: "Identifier",
  pattern: /[A-Za-z_][A-Za-z0-9_]*/,
});

export const LCurly = createToken({ name: "LCurly", pattern: /{/ });
export const RCurly = createToken({ name: "RCurly", pattern: /}/ });
export const Colon = createToken({ name: "Colon", pattern: /:/ });
export const Slash = createToken({ name: "Slash", pattern: /\// });

StateMachineKeyword.LABEL = "StateMachineKeyword";
StateKeyword.LABEL = "StateKeyword";
RegionKeyword.LABEL = "RegionKeyword";
ChoiceKeyword.LABEL = "ChoiceKeyword";
JunctionKeyword.LABEL = "JunctionKeyword";
ForkKeyword.LABEL = "ForkKeyword";
JoinKeyword.LABEL = "JoinKeyword";
HistoryKeyword.LABEL = "HistoryKeyword";
DeepHistoryKeyword.LABEL = "DeepHistoryKeyword";
TerminateKeyword.LABEL = "TerminateKeyword";
EntryKeyword.LABEL = "EntryKeyword";
DoKeyword.LABEL = "DoKeyword";
ExitKeyword.LABEL = "ExitKeyword";
DiagramKeyword.LABEL = "DiagramKeyword";

DeepHistoryKeyword.LONGER_ALT = Identifier;
StateMachineKeyword.LONGER_ALT = Identifier;
StateKeyword.LONGER_ALT = Identifier;
RegionKeyword.LONGER_ALT = Identifier;
ChoiceKeyword.LONGER_ALT = Identifier;
JunctionKeyword.LONGER_ALT = Identifier;
ForkKeyword.LONGER_ALT = Identifier;
JoinKeyword.LONGER_ALT = Identifier;
HistoryKeyword.LONGER_ALT = Identifier;
TerminateKeyword.LONGER_ALT = Identifier;
EntryKeyword.LONGER_ALT = Identifier;
DoKeyword.LONGER_ALT = Identifier;
ExitKeyword.LONGER_ALT = Identifier;
DiagramKeyword.LONGER_ALT = Identifier;

export const stateMachineTokens = [
  WhiteSpace,
  LineComment,
  BlockComment,
  TransitionArrow,
  StarVertex,
  BracketedGuard,
  DiagramKeyword,
  StateMachineKeyword,
  DeepHistoryKeyword,
  RegionKeyword,
  StateKeyword,
  ChoiceKeyword,
  JunctionKeyword,
  ForkKeyword,
  JoinKeyword,
  HistoryKeyword,
  TerminateKeyword,
  EntryKeyword,
  DoKeyword,
  ExitKeyword,
  Identifier,
  LCurly,
  RCurly,
  Colon,
  Slash,
];

export const stateMachineLexer = new Lexer(stateMachineTokens, {
  positionTracking: "full",
});
