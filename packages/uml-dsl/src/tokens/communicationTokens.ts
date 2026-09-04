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

export const CommunicationKeyword = createToken({
  name: "CommunicationKeyword",
  pattern: /communication/,
});

export const InstanceKeyword = createToken({
  name: "InstanceKeyword",
  pattern: /instance/,
});

export const MessageArrow = createToken({
  name: "MessageArrow",
  pattern: /->/,
});

export const LinkArrow = createToken({
  name: "LinkArrow",
  pattern: /--/,
});

export const SequenceNumber = createToken({
  name: "SequenceNumber",
  pattern: /\d+(?:\.\d+)*/,
});

export const MessageName = createToken({
  name: "MessageName",
  pattern: /[A-Za-z_][A-Za-z0-9_]*\(\)/,
});

export const StringLiteral = createToken({
  name: "StringLiteral",
  pattern: /"[^"]*"/,
});

export const Identifier = createToken({
  name: "Identifier",
  pattern: /[A-Za-z_][A-Za-z0-9_]*/,
});

export const LCurly = createToken({ name: "LCurly", pattern: /{/ });
export const RCurly = createToken({ name: "RCurly", pattern: /}/ });
export const Colon = createToken({ name: "Colon", pattern: /:/ });
export const Equals = createToken({ name: "Equals", pattern: /=/ });

DiagramKeyword.LABEL = "DiagramKeyword";
CommunicationKeyword.LABEL = "CommunicationKeyword";
InstanceKeyword.LABEL = "InstanceKeyword";

CommunicationKeyword.LONGER_ALT = Identifier;
InstanceKeyword.LONGER_ALT = Identifier;
DiagramKeyword.LONGER_ALT = Identifier;

export const communicationTokens = [
  WhiteSpace,
  LineComment,
  BlockComment,
  MessageArrow,
  LinkArrow,
  SequenceNumber,
  DiagramKeyword,
  CommunicationKeyword,
  InstanceKeyword,
  MessageName,
  StringLiteral,
  Identifier,
  LCurly,
  RCurly,
  Colon,
  Equals,
];

export const communicationLexer = new Lexer(communicationTokens, {
  positionTracking: "full",
});
