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

export const ProfileKeyword = createToken({
  name: "ProfileKeyword",
  pattern: /profile/,
});

export const StereotypeKeyword = createToken({
  name: "StereotypeKeyword",
  pattern: /stereotype/,
});

export const ExtensionKeyword = createToken({
  name: "ExtensionKeyword",
  pattern: /extension/,
});

export const MetaclassKeyword = createToken({
  name: "MetaclassKeyword",
  pattern: /metaclass/,
});

export const EnumKeyword = createToken({
  name: "EnumKeyword",
  pattern: /enum/,
});

export const GeneralizationArrow = createToken({
  name: "GeneralizationArrow",
  pattern: /--\|>/,
});

export const ExtensionArrow = createToken({
  name: "ExtensionArrow",
  pattern: /->/,
});

export const Identifier = createToken({
  name: "Identifier",
  pattern: /[A-Za-z_][A-Za-z0-9_]*/,
});

export const LCurly = createToken({ name: "LCurly", pattern: /{/ });
export const RCurly = createToken({ name: "RCurly", pattern: /}/ });
export const Colon = createToken({ name: "Colon", pattern: /:/ });

DiagramKeyword.LABEL = "DiagramKeyword";
ProfileKeyword.LABEL = "ProfileKeyword";
StereotypeKeyword.LABEL = "StereotypeKeyword";
ExtensionKeyword.LABEL = "ExtensionKeyword";
MetaclassKeyword.LABEL = "MetaclassKeyword";
EnumKeyword.LABEL = "EnumKeyword";

ProfileKeyword.LONGER_ALT = Identifier;
StereotypeKeyword.LONGER_ALT = Identifier;
ExtensionKeyword.LONGER_ALT = Identifier;
MetaclassKeyword.LONGER_ALT = Identifier;
EnumKeyword.LONGER_ALT = Identifier;
DiagramKeyword.LONGER_ALT = Identifier;

export const profileTokens = [
  WhiteSpace,
  LineComment,
  BlockComment,
  GeneralizationArrow,
  ExtensionArrow,
  DiagramKeyword,
  ProfileKeyword,
  StereotypeKeyword,
  ExtensionKeyword,
  MetaclassKeyword,
  EnumKeyword,
  Identifier,
  LCurly,
  RCurly,
  Colon,
];

export const profileLexer = new Lexer(profileTokens, {
  positionTracking: "full",
});
