import { createToken, Lexer } from "chevrotain";

export const WhiteSpace = createToken({
  name: "WhiteSpace",
  pattern: /\s+/,
  group: Lexer.SKIPPED,
});

export const LineComment = createToken({
  name: "LineComment",
  pattern: /\/\/[^\n\r]*/,
  group: Lexer.SKIPPED,
});

export const BlockComment = createToken({
  name: "BlockComment",
  pattern: /\/\*[\s\S]*?\*\//,
  group: Lexer.SKIPPED,
});

export const DiagramKeyword = createToken({
  name: "DiagramKeyword",
  pattern: /diagram/,
});

export const SequenceKeyword = createToken({
  name: "SequenceKeyword",
  pattern: /sequence/,
});

export const LifelineKeyword = createToken({
  name: "LifelineKeyword",
  pattern: /lifeline/,
});

export const AltKeyword = createToken({
  name: "AltKeyword",
  pattern: /alt/,
});

export const OptKeyword = createToken({
  name: "OptKeyword",
  pattern: /opt/,
});

export const LoopKeyword = createToken({
  name: "LoopKeyword",
  pattern: /loop/,
});

export const ReplyArrow = createToken({
  name: "ReplyArrow",
  pattern: /-->>/,
});

export const CreateArrow = createToken({
  name: "CreateArrow",
  pattern: /-->/,
});

export const AsyncArrow = createToken({
  name: "AsyncArrow",
  pattern: /->>/,
});

export const SyncArrow = createToken({
  name: "SyncArrow",
  pattern: /->/,
});

export const MessageName = createToken({
  name: "MessageName",
  pattern: /[A-Za-z_][A-Za-z0-9_]*\(\)/,
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
SequenceKeyword.LABEL = "SequenceKeyword";
LifelineKeyword.LABEL = "LifelineKeyword";
AltKeyword.LABEL = "AltKeyword";
OptKeyword.LABEL = "OptKeyword";
LoopKeyword.LABEL = "LoopKeyword";

SequenceKeyword.LONGER_ALT = Identifier;
LifelineKeyword.LONGER_ALT = Identifier;
AltKeyword.LONGER_ALT = Identifier;
OptKeyword.LONGER_ALT = Identifier;
LoopKeyword.LONGER_ALT = Identifier;
DiagramKeyword.LONGER_ALT = Identifier;

export const sequenceTokens = [
  WhiteSpace,
  LineComment,
  BlockComment,
  ReplyArrow,
  CreateArrow,
  AsyncArrow,
  SyncArrow,
  DiagramKeyword,
  SequenceKeyword,
  LifelineKeyword,
  AltKeyword,
  OptKeyword,
  LoopKeyword,
  MessageName,
  Identifier,
  LCurly,
  RCurly,
  LBracket,
  RBracket,
  Colon,
];

export const sequenceLexer = new Lexer(sequenceTokens, {
  positionTracking: "full",
});
