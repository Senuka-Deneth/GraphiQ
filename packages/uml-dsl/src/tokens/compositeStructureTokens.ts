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

export const CompositeStructureDiagramKeyword = createToken({
  name: "CompositeStructureDiagramKeyword",
  pattern: /compositeStructure/,
});

export const ClassKeyword = createToken({
  name: "ClassKeyword",
  pattern: /class/,
});

export const ComponentKeyword = createToken({
  name: "ComponentKeyword",
  pattern: /component/,
});

export const PartKeyword = createToken({
  name: "PartKeyword",
  pattern: /part/,
});

export const PortKeyword = createToken({
  name: "PortKeyword",
  pattern: /port/,
});

export const ConnectorKeyword = createToken({
  name: "ConnectorKeyword",
  pattern: /connector/,
});

export const ToKeyword = createToken({
  name: "ToKeyword",
  pattern: /to/,
});

export const Multiplicity = createToken({
  name: "Multiplicity",
  pattern: /\[[^\]]+\]/,
});

export const Identifier = createToken({
  name: "Identifier",
  pattern: /[A-Za-z_][A-Za-z0-9_]*/,
});

export const Dot = createToken({ name: "Dot", pattern: /\./ });
export const LCurly = createToken({ name: "LCurly", pattern: /{/ });
export const RCurly = createToken({ name: "RCurly", pattern: /}/ });
export const Colon = createToken({ name: "Colon", pattern: /:/ });

DiagramKeyword.LABEL = "DiagramKeyword";
CompositeStructureDiagramKeyword.LABEL = "CompositeStructureDiagramKeyword";
ClassKeyword.LABEL = "ClassKeyword";
ComponentKeyword.LABEL = "ComponentKeyword";
PartKeyword.LABEL = "PartKeyword";
PortKeyword.LABEL = "PortKeyword";
ConnectorKeyword.LABEL = "ConnectorKeyword";
ToKeyword.LABEL = "ToKeyword";

CompositeStructureDiagramKeyword.LONGER_ALT = Identifier;
ClassKeyword.LONGER_ALT = Identifier;
ComponentKeyword.LONGER_ALT = Identifier;
PartKeyword.LONGER_ALT = Identifier;
PortKeyword.LONGER_ALT = Identifier;
ConnectorKeyword.LONGER_ALT = Identifier;
ToKeyword.LONGER_ALT = Identifier;
DiagramKeyword.LONGER_ALT = Identifier;

export const compositeStructureTokens = [
  WhiteSpace,
  LineComment,
  BlockComment,
  Multiplicity,
  DiagramKeyword,
  CompositeStructureDiagramKeyword,
  ConnectorKeyword,
  ComponentKeyword,
  ClassKeyword,
  PartKeyword,
  PortKeyword,
  ToKeyword,
  Identifier,
  Dot,
  LCurly,
  RCurly,
  Colon,
];

export const compositeStructureLexer = new Lexer(compositeStructureTokens, {
  positionTracking: "full",
});
