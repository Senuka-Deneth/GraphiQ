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

export const ObjectKeyword = createToken({
  name: "ObjectKeyword",
  pattern: /object/,
});

export const InstanceKeyword = createToken({
  name: "InstanceKeyword",
  pattern: /instance/,
});

export const LinkArrow = createToken({
  name: "LinkArrow",
  pattern: /--/,
});

export const DependencyArrow = createToken({
  name: "DependencyArrow",
  pattern: /\.\.>/,
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
ObjectKeyword.LABEL = "ObjectKeyword";
InstanceKeyword.LABEL = "InstanceKeyword";

ObjectKeyword.LONGER_ALT = Identifier;
InstanceKeyword.LONGER_ALT = Identifier;
DiagramKeyword.LONGER_ALT = Identifier;

export const objectTokens = [
  WhiteSpace,
  LineComment,
  BlockComment,
  DependencyArrow,
  LinkArrow,
  DiagramKeyword,
  ObjectKeyword,
  InstanceKeyword,
  StringLiteral,
  Identifier,
  LCurly,
  RCurly,
  Colon,
  Equals,
];

export const objectLexer = new Lexer(objectTokens, {
  positionTracking: "full",
});
