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

export const ClassKeyword = createToken({
  name: "ClassKeyword",
  pattern: /class/,
});

export const InterfaceKeyword = createToken({
  name: "InterfaceKeyword",
  pattern: /interface/,
});

export const AbstractKeyword = createToken({
  name: "AbstractKeyword",
  pattern: /abstract/,
});

export const EnumKeyword = createToken({
  name: "EnumKeyword",
  pattern: /enum/,
});

export const GeneralizationArrow = createToken({
  name: "GeneralizationArrow",
  pattern: /--\|>/,
});

export const RealizationArrow = createToken({
  name: "RealizationArrow",
  pattern: /\.\.\|>/,
});

export const NavigableArrow = createToken({
  name: "NavigableArrow",
  pattern: /-->/,
});

export const AssociationArrow = createToken({
  name: "AssociationArrow",
  pattern: /--/,
});

export const AggregationArrow = createToken({
  name: "AggregationArrow",
  pattern: /o--/,
});

export const CompositionArrow = createToken({
  name: "CompositionArrow",
  pattern: /\*--/,
});

export const DependencyArrow = createToken({
  name: "DependencyArrow",
  pattern: /\.\.>/,
});

export const PublicVisibility = createToken({
  name: "PublicVisibility",
  pattern: /\+/,
});

export const PrivateVisibility = createToken({
  name: "PrivateVisibility",
  pattern: /-/,
});

export const ProtectedVisibility = createToken({
  name: "ProtectedVisibility",
  pattern: /#/,
});

export const PackageVisibility = createToken({
  name: "PackageVisibility",
  pattern: /~/,
});

export const QuotedMultiplicity = createToken({
  name: "QuotedMultiplicity",
  pattern: /"[^"]*"/,
});

export const UnquotedMultiplicity = createToken({
  name: "UnquotedMultiplicity",
  pattern: /(\d+|\*)(\.\.(\d+|\*))?/,
});

export const Identifier = createToken({
  name: "Identifier",
  pattern: /[A-Za-z_][A-Za-z0-9_]*/,
});

export const LCurly = createToken({ name: "LCurly", pattern: /{/ });
export const RCurly = createToken({ name: "RCurly", pattern: /}/ });
export const LParen = createToken({ name: "LParen", pattern: /\(/ });
export const RParen = createToken({ name: "RParen", pattern: /\)/ });
export const LBracket = createToken({ name: "LBracket", pattern: /\[/ });
export const RBracket = createToken({ name: "RBracket", pattern: /\]/ });
export const Colon = createToken({ name: "Colon", pattern: /:/ });
export const Equals = createToken({ name: "Equals", pattern: /=/ });
export const Comma = createToken({ name: "Comma", pattern: /,/ });

DiagramKeyword.LABEL = "DiagramKeyword";
ClassKeyword.LABEL = "ClassKeyword";
InterfaceKeyword.LABEL = "InterfaceKeyword";
AbstractKeyword.LABEL = "AbstractKeyword";
EnumKeyword.LABEL = "EnumKeyword";

ClassKeyword.LONGER_ALT = Identifier;
InterfaceKeyword.LONGER_ALT = Identifier;
AbstractKeyword.LONGER_ALT = Identifier;
EnumKeyword.LONGER_ALT = Identifier;
DiagramKeyword.LONGER_ALT = Identifier;

export const allTokens = [
  WhiteSpace,
  LineComment,
  BlockComment,
  GeneralizationArrow,
  RealizationArrow,
  NavigableArrow,
  AggregationArrow,
  CompositionArrow,
  DependencyArrow,
  AssociationArrow,
  DiagramKeyword,
  ClassKeyword,
  InterfaceKeyword,
  AbstractKeyword,
  EnumKeyword,
  PublicVisibility,
  PrivateVisibility,
  ProtectedVisibility,
  PackageVisibility,
  QuotedMultiplicity,
  UnquotedMultiplicity,
  Identifier,
  LCurly,
  RCurly,
  LParen,
  RParen,
  LBracket,
  RBracket,
  Colon,
  Equals,
  Comma,
];

export const classLexer = new Lexer(allTokens, {
  positionTracking: "full",
});
