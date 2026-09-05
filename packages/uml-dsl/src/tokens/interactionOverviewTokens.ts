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

export const InteractionOverviewKeyword = createToken({
  name: "InteractionOverviewKeyword",
  pattern: /interactionOverview/,
});

export const RefKeyword = createToken({
  name: "RefKeyword",
  pattern: /ref/,
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

export const LBracket = createToken({ name: "LBracket", pattern: /\[/ });
export const RBracket = createToken({ name: "RBracket", pattern: /\]/ });
export const Colon = createToken({ name: "Colon", pattern: /:/ });

DiagramKeyword.LABEL = "DiagramKeyword";
InteractionOverviewKeyword.LABEL = "InteractionOverviewKeyword";
RefKeyword.LABEL = "RefKeyword";
DecisionKeyword.LABEL = "DecisionKeyword";
MergeKeyword.LABEL = "MergeKeyword";
ForkKeyword.LABEL = "ForkKeyword";
JoinKeyword.LABEL = "JoinKeyword";
InitialKeyword.LABEL = "InitialKeyword";
FinalKeyword.LABEL = "FinalKeyword";

InteractionOverviewKeyword.LONGER_ALT = Identifier;
RefKeyword.LONGER_ALT = Identifier;
DecisionKeyword.LONGER_ALT = Identifier;
MergeKeyword.LONGER_ALT = Identifier;
ForkKeyword.LONGER_ALT = Identifier;
JoinKeyword.LONGER_ALT = Identifier;
InitialKeyword.LONGER_ALT = Identifier;
FinalKeyword.LONGER_ALT = Identifier;
DiagramKeyword.LONGER_ALT = Identifier;

export const interactionOverviewTokens = [
  WhiteSpace,
  LineComment,
  BlockComment,
  FlowArrow,
  DiagramKeyword,
  InteractionOverviewKeyword,
  RefKeyword,
  DecisionKeyword,
  MergeKeyword,
  ForkKeyword,
  JoinKeyword,
  InitialKeyword,
  FinalKeyword,
  Identifier,
  LBracket,
  RBracket,
  Colon,
];

export const interactionOverviewLexer = new Lexer(interactionOverviewTokens, {
  positionTracking: "full",
});
