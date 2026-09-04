import { CstParser, type CstNode, type ILexingError, type IRecognitionException, type IToken } from "chevrotain";
import type { RelationshipType } from "@graphiq/uml-model";
import type {
  AstActorDeclaration,
  AstSubjectDeclaration,
  AstUseCaseDeclaration,
  AstUseCaseRelationship,
  DslSpan,
  UseCaseDiagramAst,
} from "../ast.js";
import {
  ActorKeyword,
  AngleStereotype,
  AssociationArrow,
  DependencyArrow,
  DiagramKeyword,
  GeneralizationArrow,
  GuillemetStereotype,
  Identifier,
  LCurly,
  RCurly,
  SubjectKeyword,
  UseCaseDiagramKeyword,
  UseCaseElementKeyword,
  useCaseLexer,
  useCaseTokens,
  Colon,
} from "../tokens/useCaseTokens.js";

export class UseCaseDslParser extends CstParser {
  constructor() {
    super(useCaseTokens, { recoveryEnabled: true });
    this.performSelfAnalysis();
  }

  public document = this.RULE("document", () => {
    this.CONSUME(DiagramKeyword);
    this.CONSUME(UseCaseDiagramKeyword, { LABEL: "diagramKind" });
    this.OPTION1(() => {
      this.CONSUME1(Identifier, { LABEL: "diagramName" });
    });
    this.MANY(() => {
      this.OR([
        { ALT: () => this.SUBRULE(this.actorDeclaration) },
        { ALT: () => this.SUBRULE(this.subjectDeclaration) },
        { ALT: () => this.SUBRULE(this.standaloneUseCaseDeclaration) },
        {
          GATE: () => this.LA(2).tokenType === GeneralizationArrow,
          ALT: () => this.SUBRULE(this.generalizationDeclaration),
        },
        {
          GATE: () => this.LA(2).tokenType === DependencyArrow,
          ALT: () => this.SUBRULE(this.dependencyDeclaration),
        },
        {
          GATE: () => this.LA(2).tokenType === AssociationArrow,
          ALT: () => this.SUBRULE(this.associationDeclaration),
        },
      ]);
    });
  });

  private actorDeclaration = this.RULE("actorDeclaration", () => {
    this.CONSUME(ActorKeyword);
    this.CONSUME(Identifier, { LABEL: "actorName" });
  });

  private subjectDeclaration = this.RULE("subjectDeclaration", () => {
    this.CONSUME(SubjectKeyword);
    this.CONSUME1(Identifier, { LABEL: "subjectName" });
    this.CONSUME(LCurly);
    this.MANY1(() => {
      this.SUBRULE(this.nestedUseCaseDeclaration);
    });
    this.CONSUME(RCurly);
  });

  private nestedUseCaseDeclaration = this.RULE("nestedUseCaseDeclaration", () => {
    this.CONSUME(UseCaseElementKeyword);
    this.CONSUME2(Identifier, { LABEL: "useCaseName" });
  });

  private standaloneUseCaseDeclaration = this.RULE("standaloneUseCaseDeclaration", () => {
    this.CONSUME(UseCaseElementKeyword);
    this.CONSUME3(Identifier, { LABEL: "standaloneUseCaseName" });
  });

  private associationDeclaration = this.RULE("associationDeclaration", () => {
    this.CONSUME4(Identifier, { LABEL: "sourceName" });
    this.CONSUME(AssociationArrow);
    this.CONSUME5(Identifier, { LABEL: "targetName" });
  });

  private dependencyDeclaration = this.RULE("dependencyDeclaration", () => {
    this.CONSUME6(Identifier, { LABEL: "dependencySourceName" });
    this.CONSUME(DependencyArrow);
    this.CONSUME7(Identifier, { LABEL: "dependencyTargetName" });
    this.OPTION2(() => {
      this.CONSUME(Colon);
      this.SUBRULE(this.relationshipLabel);
    });
  });

  private generalizationDeclaration = this.RULE("generalizationDeclaration", () => {
    this.CONSUME8(Identifier, { LABEL: "generalizationSourceName" });
    this.CONSUME(GeneralizationArrow);
    this.CONSUME9(Identifier, { LABEL: "generalizationTargetName" });
  });

  private relationshipLabel = this.RULE("relationshipLabel", () => {
    this.OR([
      { ALT: () => this.CONSUME(GuillemetStereotype) },
      { ALT: () => this.CONSUME(AngleStereotype) },
      { ALT: () => this.CONSUME(Identifier, { LABEL: "relationshipLabelName" }) },
    ]);
  });
}

function tokenSpan(startToken: IToken, endToken?: IToken): DslSpan {
  const end = endToken ?? startToken;
  return {
    start: startToken.startOffset,
    end: (end.endOffset ?? end.startOffset) + 1,
  };
}

function firstToken(node: CstNode | undefined): IToken | undefined {
  return node?.children[Object.keys(node.children)[0] ?? ""]?.[0] as IToken | undefined;
}

function lastToken(node: CstNode | undefined): IToken | undefined {
  if (!node) {
    return undefined;
  }
  const keys = Object.keys(node.children);
  for (let index = keys.length - 1; index >= 0; index -= 1) {
    const key = keys[index];
    if (!key) {
      continue;
    }
    const children = node.children[key];
    if (!children || children.length === 0) {
      continue;
    }
    const lastChild = children[children.length - 1];
    if (!lastChild) {
      continue;
    }
    if ("image" in lastChild) {
      return lastChild as IToken;
    }
    return lastToken(lastChild as CstNode);
  }
  return undefined;
}

function stereotypeName(image: string): string {
  if (image.startsWith("«") && image.endsWith("»")) {
    return image.slice(1, -1);
  }
  if (image.startsWith("<<") && image.endsWith(">>")) {
    return image.slice(2, -2);
  }
  return image;
}

function relationshipTypeFromLabel(
  label: string,
): Extract<RelationshipType, "include" | "extend" | "dependency"> {
  const normalized = stereotypeName(label).trim().toLowerCase();
  if (normalized === "include") {
    return "include";
  }
  if (normalized === "extend") {
    return "extend";
  }
  return "dependency";
}

class UseCaseDslVisitor {
  visit(cst: CstNode): UseCaseDiagramAst {
    const nameToken = cst.children.diagramName?.[0] as IToken | undefined;
    const actors: AstActorDeclaration[] = [];
    const subjects: AstSubjectDeclaration[] = [];
    const useCases: AstUseCaseDeclaration[] = [];
    const relationships: AstUseCaseRelationship[] = [];

    for (const node of cst.children.actorDeclaration ?? []) {
      actors.push(this.visitActor(node as CstNode));
    }

    for (const node of cst.children.subjectDeclaration ?? []) {
      subjects.push(this.visitSubject(node as CstNode));
    }

    for (const node of cst.children.standaloneUseCaseDeclaration ?? []) {
      useCases.push(this.visitStandaloneUseCase(node as CstNode));
    }

    for (const node of cst.children.associationDeclaration ?? []) {
      relationships.push(this.visitAssociation(node as CstNode));
    }

    for (const node of cst.children.dependencyDeclaration ?? []) {
      relationships.push(this.visitDependency(node as CstNode));
    }

    for (const node of cst.children.generalizationDeclaration ?? []) {
      relationships.push(this.visitGeneralization(node as CstNode));
    }

    const first = firstToken(cst);
    const last = lastToken(cst);
    const span = first !== undefined ? tokenSpan(first, last) : { start: 0, end: 0 };

    return {
      kind: "useCase",
      name: nameToken?.image,
      actors,
      subjects,
      useCases,
      relationships,
      span,
    };
  }

  private visitActor(node: CstNode): AstActorDeclaration {
    const nameToken = node.children.actorName?.[0] as IToken;
    return {
      name: nameToken.image,
      span: tokenSpan(nameToken, lastToken(node)),
    };
  }

  private visitSubject(node: CstNode): AstSubjectDeclaration {
    const nameToken = node.children.subjectName?.[0] as IToken;
    const useCases: AstUseCaseDeclaration[] = [];

    for (const nested of node.children.nestedUseCaseDeclaration ?? []) {
      const nestedNode = nested as CstNode;
      const useCaseNameToken = nestedNode.children.useCaseName?.[0] as IToken;
      useCases.push({
        name: useCaseNameToken.image,
        span: tokenSpan(useCaseNameToken, lastToken(nestedNode)),
      });
    }

    return {
      name: nameToken.image,
      useCases,
      span: tokenSpan(nameToken, lastToken(node)),
    };
  }

  private visitStandaloneUseCase(node: CstNode): AstUseCaseDeclaration {
    const nameToken = node.children.standaloneUseCaseName?.[0] as IToken;
    return {
      name: nameToken.image,
      span: tokenSpan(nameToken, lastToken(node)),
    };
  }

  private visitAssociation(node: CstNode): AstUseCaseRelationship {
    const sourceToken = node.children.sourceName?.[0] as IToken;
    const targetToken = node.children.targetName?.[0] as IToken;
    return {
      sourceName: sourceToken.image,
      targetName: targetToken.image,
      relationshipType: "association",
      span: tokenSpan(sourceToken, lastToken(node)),
    };
  }

  private visitDependency(node: CstNode): AstUseCaseRelationship {
    const sourceToken = node.children.dependencySourceName?.[0] as IToken;
    const targetToken = node.children.dependencyTargetName?.[0] as IToken;
    const labelNode = node.children.relationshipLabel?.[0] as CstNode | undefined;
    const labelToken = labelNode
      ? ((labelNode.children.GuillemetStereotype?.[0] ??
          labelNode.children.AngleStereotype?.[0] ??
          labelNode.children.relationshipLabelName?.[0]) as IToken | undefined)
      : undefined;

    const relationshipType =
      labelToken === undefined
        ? "dependency"
        : relationshipTypeFromLabel(labelToken.image);

    return {
      sourceName: sourceToken.image,
      targetName: targetToken.image,
      relationshipType,
      span: tokenSpan(sourceToken, lastToken(node)),
    };
  }

  private visitGeneralization(node: CstNode): AstUseCaseRelationship {
    const sourceToken = node.children.generalizationSourceName?.[0] as IToken;
    const targetToken = node.children.generalizationTargetName?.[0] as IToken;
    return {
      sourceName: sourceToken.image,
      targetName: targetToken.image,
      relationshipType: "generalization",
      span: tokenSpan(sourceToken, lastToken(node)),
    };
  }
}

const parser = new UseCaseDslParser();
const visitor = new UseCaseDslVisitor();

export function parseUseCaseDocument(cst: CstNode): UseCaseDiagramAst {
  return visitor.visit(cst);
}

export function parseUseCaseCst(text: string): {
  cst: CstNode;
  lexerErrors: ILexingError[];
  parserErrors: IRecognitionException[];
} {
  const lexResult = useCaseLexer.tokenize(text);
  parser.input = lexResult.tokens;
  const cst = parser.document();

  return {
    cst,
    lexerErrors: lexResult.errors,
    parserErrors: parser.errors,
  };
}
