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

export const DiagramKeyword = createToken({
  name: "DiagramKeyword",
  pattern: /diagram/,
});

export const TimingKeyword = createToken({
  name: "TimingKeyword",
  pattern: /timing/,
});

export const LifelineKeyword = createToken({
  name: "LifelineKeyword",
  pattern: /lifeline/,
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

export const RangeDots = createToken({
  name: "RangeDots",
  pattern: /\.\./,
});

export const AtSign = createToken({
  name: "AtSign",
  pattern: /@/,
});

export const NumberLiteral = createToken({
  name: "NumberLiteral",
  pattern: /-?\d+(?:\.\d+)?/,
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
export const Colon = createToken({ name: "Colon", pattern: /:/ });

DiagramKeyword.LABEL = "DiagramKeyword";
TimingKeyword.LABEL = "TimingKeyword";
LifelineKeyword.LABEL = "LifelineKeyword";

TimingKeyword.LONGER_ALT = Identifier;
LifelineKeyword.LONGER_ALT = Identifier;
DiagramKeyword.LONGER_ALT = Identifier;

export const timingTokens = [
  WhiteSpace,
  LineComment,
  BlockComment,
  ReplyArrow,
  CreateArrow,
  AsyncArrow,
  SyncArrow,
  RangeDots,
  AtSign,
  DiagramKeyword,
  TimingKeyword,
  LifelineKeyword,
  NumberLiteral,
  MessageName,
  Identifier,
  LCurly,
  RCurly,
  Colon,
];

export const timingLexer = new Lexer(timingTokens, {
  positionTracking: "full",
});
