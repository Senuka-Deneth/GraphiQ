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

export const FlowArrow = createToken({
  name: "FlowArrow",
  pattern: /-->/,
});

export const DiagramKeyword = createToken({
  name: "DiagramKeyword",
  pattern: /diagram/,
});

export const ActivityKeyword = createToken({
  name: "ActivityKeyword",
  pattern: /activity/,
});

export const PartitionKeyword = createToken({
  name: "PartitionKeyword",
  pattern: /partition/,
});

export const InterruptibleKeyword = createToken({
  name: "InterruptibleKeyword",
  pattern: /interruptible/,
});

export const ActionKeyword = createToken({
  name: "ActionKeyword",
  pattern: /action/,
});

export const ObjectKeyword = createToken({
  name: "ObjectKeyword",
  pattern: /object/,
});

export const DecisionKeyword = createToken({
  name: "DecisionKeyword",
  pattern: /decision/,
});

export const MergeKeyword = createToken({
  name: "MergeKeyword",
  pattern: /merge/,
});

export const ForkKeyword = createToken({
  name: "ForkKeyword",
  pattern: /fork/,
});

export const JoinKeyword = createToken({
  name: "JoinKeyword",
  pattern: /join/,
});

export const FlowFinalKeyword = createToken({
  name: "FlowFinalKeyword",
  pattern: /flowFinal/,
});

export const InitialKeyword = createToken({
  name: "InitialKeyword",
  pattern: /initial/,
});

export const FinalKeyword = createToken({
  name: "FinalKeyword",
  pattern: /final/,
});

export const Identifier = createToken({
  name: "Identifier",
  pattern: /[A-Za-z_][A-Za-z0-9_]*/,
});

export const LCurly = createToken({ name: "LCurly", pattern: /{/ });
export const RCurly = createToken({ name: "RCurly", pattern: /}/ });
export const LBracket = createToken({ name: "LBracket", pattern: /\[/ });
export const RBracket = createToken({ name: "RBracket", pattern: /\]/ });
export const Colon = createToken({ name: "Colon", pattern: /:/ });

DiagramKeyword.LABEL = "DiagramKeyword";
ActivityKeyword.LABEL = "ActivityKeyword";
PartitionKeyword.LABEL = "PartitionKeyword";
InterruptibleKeyword.LABEL = "InterruptibleKeyword";
ActionKeyword.LABEL = "ActionKeyword";
ObjectKeyword.LABEL = "ObjectKeyword";
DecisionKeyword.LABEL = "DecisionKeyword";
MergeKeyword.LABEL = "MergeKeyword";
ForkKeyword.LABEL = "ForkKeyword";
JoinKeyword.LABEL = "JoinKeyword";
FlowFinalKeyword.LABEL = "FlowFinalKeyword";
InitialKeyword.LABEL = "InitialKeyword";
FinalKeyword.LABEL = "FinalKeyword";

ActivityKeyword.LONGER_ALT = Identifier;
PartitionKeyword.LONGER_ALT = Identifier;
InterruptibleKeyword.LONGER_ALT = Identifier;
ActionKeyword.LONGER_ALT = Identifier;
ObjectKeyword.LONGER_ALT = Identifier;
DecisionKeyword.LONGER_ALT = Identifier;
MergeKeyword.LONGER_ALT = Identifier;
ForkKeyword.LONGER_ALT = Identifier;
JoinKeyword.LONGER_ALT = Identifier;
FlowFinalKeyword.LONGER_ALT = Identifier;
InitialKeyword.LONGER_ALT = Identifier;
FinalKeyword.LONGER_ALT = Identifier;
DiagramKeyword.LONGER_ALT = Identifier;

export const activityTokens = [
  WhiteSpace,
  LineComment,
  BlockComment,
  FlowArrow,
  DiagramKeyword,
  ActivityKeyword,
  PartitionKeyword,
  InterruptibleKeyword,
  ActionKeyword,
  ObjectKeyword,
  DecisionKeyword,
  MergeKeyword,
  ForkKeyword,
  JoinKeyword,
  FlowFinalKeyword,
  InitialKeyword,
  FinalKeyword,
  Identifier,
  LCurly,
  RCurly,
  LBracket,
  RBracket,
  Colon,
];

export const activityLexer = new Lexer(activityTokens, {
  positionTracking: "full",
});
