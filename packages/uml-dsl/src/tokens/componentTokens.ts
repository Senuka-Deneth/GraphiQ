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

export const ComponentKeyword = createToken({
  name: "ComponentKeyword",
  pattern: /component/,
});

export const ProvidesKeyword = createToken({
  name: "ProvidesKeyword",
  pattern: /provides/,
});

export const RequiresKeyword = createToken({
  name: "RequiresKeyword",
  pattern: /requires/,
});

export const ProvidedKeyword = createToken({
  name: "ProvidedKeyword",
  pattern: /provided/,
});

export const RequiredKeyword = createToken({
  name: "RequiredKeyword",
  pattern: /required/,
});

export const PortKeyword = createToken({
  name: "PortKeyword",
  pattern: /port/,
});

export const ArtifactKeyword = createToken({
  name: "ArtifactKeyword",
  pattern: /artifact/,
});

export const DependencyArrow = createToken({
  name: "DependencyArrow",
  pattern: /\.\.>/,
});

export const AssemblyArrow = createToken({
  name: "AssemblyArrow",
  pattern: /--/,
});

export const Identifier = createToken({
  name: "Identifier",
  pattern: /[A-Za-z_][A-Za-z0-9_]*/,
});

export const LCurly = createToken({ name: "LCurly", pattern: /{/ });
export const RCurly = createToken({ name: "RCurly", pattern: /}/ });

DiagramKeyword.LABEL = "DiagramKeyword";
ComponentKeyword.LABEL = "ComponentKeyword";
ProvidesKeyword.LABEL = "ProvidesKeyword";
RequiresKeyword.LABEL = "RequiresKeyword";
ProvidedKeyword.LABEL = "ProvidedKeyword";
RequiredKeyword.LABEL = "RequiredKeyword";
PortKeyword.LABEL = "PortKeyword";
ArtifactKeyword.LABEL = "ArtifactKeyword";

ComponentKeyword.LONGER_ALT = Identifier;
ProvidesKeyword.LONGER_ALT = Identifier;
RequiresKeyword.LONGER_ALT = Identifier;
ProvidedKeyword.LONGER_ALT = Identifier;
RequiredKeyword.LONGER_ALT = Identifier;
PortKeyword.LONGER_ALT = Identifier;
ArtifactKeyword.LONGER_ALT = Identifier;
DiagramKeyword.LONGER_ALT = Identifier;

export const componentTokens = [
  WhiteSpace,
  LineComment,
  BlockComment,
  DependencyArrow,
  AssemblyArrow,
  DiagramKeyword,
  ComponentKeyword,
  ProvidesKeyword,
  RequiresKeyword,
  ProvidedKeyword,
  RequiredKeyword,
  PortKeyword,
  ArtifactKeyword,
  Identifier,
  LCurly,
  RCurly,
];

export const componentLexer = new Lexer(componentTokens, {
  positionTracking: "full",
});
