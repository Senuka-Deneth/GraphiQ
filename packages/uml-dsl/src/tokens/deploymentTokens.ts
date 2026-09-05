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

export const DeploymentKeyword = createToken({
  name: "DeploymentKeyword",
  pattern: /deployment/,
});

export const NodeKeyword = createToken({
  name: "NodeKeyword",
  pattern: /node/,
});

export const ArtifactKeyword = createToken({
  name: "ArtifactKeyword",
  pattern: /artifact/,
});

export const GeneralizationArrow = createToken({
  name: "GeneralizationArrow",
  pattern: /--\|>/,
});

export const DependencyArrow = createToken({
  name: "DependencyArrow",
  pattern: /\.\.>/,
});

export const CommunicationArrow = createToken({
  name: "CommunicationArrow",
  pattern: /--/,
});

export const GuillemetStereotype = createToken({
  name: "GuillemetStereotype",
  pattern: /«[^»]+»/,
});

export const AngleStereotype = createToken({
  name: "AngleStereotype",
  pattern: /<<[^>]+>>/,
});

export const StringLiteral = createToken({
  name: "StringLiteral",
  pattern: /"[^"]*"/,
});

export const Identifier = createToken({
  name: "Identifier",
  pattern: /[A-Za-z_][A-Za-z0-9_.]*/,
});

export const LCurly = createToken({ name: "LCurly", pattern: /{/ });
export const RCurly = createToken({ name: "RCurly", pattern: /}/ });
export const Colon = createToken({ name: "Colon", pattern: /:/ });

DiagramKeyword.LABEL = "DiagramKeyword";
DeploymentKeyword.LABEL = "DeploymentKeyword";
NodeKeyword.LABEL = "NodeKeyword";
ArtifactKeyword.LABEL = "ArtifactKeyword";

DeploymentKeyword.LONGER_ALT = Identifier;
NodeKeyword.LONGER_ALT = Identifier;
ArtifactKeyword.LONGER_ALT = Identifier;
DiagramKeyword.LONGER_ALT = Identifier;

export const deploymentTokens = [
  WhiteSpace,
  LineComment,
  BlockComment,
  GeneralizationArrow,
  DependencyArrow,
  CommunicationArrow,
  GuillemetStereotype,
  AngleStereotype,
  DiagramKeyword,
  DeploymentKeyword,
  NodeKeyword,
  ArtifactKeyword,
  StringLiteral,
  Identifier,
  LCurly,
  RCurly,
  Colon,
];

export const deploymentLexer = new Lexer(deploymentTokens, {
  positionTracking: "full",
});
