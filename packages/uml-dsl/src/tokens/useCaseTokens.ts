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

export const UseCaseDiagramKeyword = createToken({
  name: "UseCaseDiagramKeyword",
  pattern: /useCase/,
});

export const UseCaseElementKeyword = createToken({
  name: "UseCaseElementKeyword",
  pattern: /usecase/,
});

export const ActorKeyword = createToken({
  name: "ActorKeyword",
  pattern: /actor/,
});

export const SubjectKeyword = createToken({
  name: "SubjectKeyword",
  pattern: /subject/,
});

export const GeneralizationArrow = createToken({
  name: "GeneralizationArrow",
  pattern: /--\|>/,
});

export const DependencyArrow = createToken({
  name: "DependencyArrow",
  pattern: /\.\.>/,
});

export const AssociationArrow = createToken({
  name: "AssociationArrow",
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

export const Identifier = createToken({
  name: "Identifier",
  pattern: /[A-Za-z_][A-Za-z0-9_]*/,
});

export const LCurly = createToken({ name: "LCurly", pattern: /{/ });
export const RCurly = createToken({ name: "RCurly", pattern: /}/ });
export const Colon = createToken({ name: "Colon", pattern: /:/ });

DiagramKeyword.LABEL = "DiagramKeyword";
UseCaseDiagramKeyword.LABEL = "UseCaseDiagramKeyword";
UseCaseElementKeyword.LABEL = "UseCaseElementKeyword";
ActorKeyword.LABEL = "ActorKeyword";
SubjectKeyword.LABEL = "SubjectKeyword";

UseCaseDiagramKeyword.LONGER_ALT = Identifier;
UseCaseElementKeyword.LONGER_ALT = Identifier;
ActorKeyword.LONGER_ALT = Identifier;
SubjectKeyword.LONGER_ALT = Identifier;
DiagramKeyword.LONGER_ALT = Identifier;

export const useCaseTokens = [
  WhiteSpace,
  LineComment,
  BlockComment,
  GeneralizationArrow,
  DependencyArrow,
  AssociationArrow,
  GuillemetStereotype,
  AngleStereotype,
  DiagramKeyword,
  UseCaseDiagramKeyword,
  UseCaseElementKeyword,
  ActorKeyword,
  SubjectKeyword,
  Identifier,
  LCurly,
  RCurly,
  Colon,
];

export const useCaseLexer = new Lexer(useCaseTokens, {
  positionTracking: "full",
});
