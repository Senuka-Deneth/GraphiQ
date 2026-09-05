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

export const PackageKeyword = createToken({
  name: "PackageKeyword",
  pattern: /package/,
});

export const ClassKeyword = createToken({
  name: "ClassKeyword",
  pattern: /class/,
});

export const InterfaceKeyword = createToken({
  name: "InterfaceKeyword",
  pattern: /interface/,
});

export const EnumKeyword = createToken({
  name: "EnumKeyword",
  pattern: /enum/,
});

export const AbstractKeyword = createToken({
  name: "AbstractKeyword",
  pattern: /abstract/,
});

export const DependencyArrow = createToken({
  name: "DependencyArrow",
  pattern: /\.\.>/,
});

export const GuillemetStereotype = createToken({
  name: "GuillemetStereotype",
  pattern: /«[^»]+»/,
});

export const AngleStereotype = createToken({
  name: "AngleStereotype",
  pattern: /<<[^>]+>>/,
});

export const Identifier = createToken({
  name: "Identifier",
  pattern: /[A-Za-z_][A-Za-z0-9_]*/,
});

export const LCurly = createToken({ name: "LCurly", pattern: /{/ });
export const RCurly = createToken({ name: "RCurly", pattern: /}/ });
export const Colon = createToken({ name: "Colon", pattern: /:/ });

DiagramKeyword.LABEL = "DiagramKeyword";
PackageKeyword.LABEL = "PackageKeyword";
ClassKeyword.LABEL = "ClassKeyword";
InterfaceKeyword.LABEL = "InterfaceKeyword";
EnumKeyword.LABEL = "EnumKeyword";
AbstractKeyword.LABEL = "AbstractKeyword";

PackageKeyword.LONGER_ALT = Identifier;
ClassKeyword.LONGER_ALT = Identifier;
InterfaceKeyword.LONGER_ALT = Identifier;
EnumKeyword.LONGER_ALT = Identifier;
AbstractKeyword.LONGER_ALT = Identifier;
DiagramKeyword.LONGER_ALT = Identifier;

export const packageTokens = [
  WhiteSpace,
  LineComment,
  BlockComment,
  DependencyArrow,
  GuillemetStereotype,
  AngleStereotype,
  DiagramKeyword,
  PackageKeyword,
  AbstractKeyword,
  ClassKeyword,
  InterfaceKeyword,
  EnumKeyword,
  Identifier,
  LCurly,
  RCurly,
  Colon,
];

export const packageLexer = new Lexer(packageTokens, {
  positionTracking: "full",
});
