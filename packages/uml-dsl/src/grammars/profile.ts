import { CstParser, type CstNode, type ILexingError, type IRecognitionException, type IToken } from "chevrotain";
import type {
  AstMetaclassDeclaration,
  AstProfileEnumeration,
  AstProfileFrameDeclaration,
  AstProfileRelationship,
  AstStereotypeDeclaration,
  AstTaggedValue,
  DslSpan,
  ProfileDiagramAst,
} from "../ast.js";
import { commentsFromLexerGroups } from "../comments.js";
import {
  Colon,
  DiagramKeyword,
  EnumKeyword,
  ExtensionArrow,
  ExtensionKeyword,
  GeneralizationArrow,
  Identifier,
  LCurly,
  MetaclassKeyword,
  ProfileKeyword,
  RCurly,
  StereotypeKeyword,
  profileLexer,
  profileTokens,
} from "../tokens/profileTokens.js";

export class ProfileDslParser extends CstParser {
  constructor() {
    super(profileTokens, { recoveryEnabled: true });
    this.performSelfAnalysis();
  }

  public document = this.RULE("document", () => {
    this.CONSUME(DiagramKeyword);
    this.CONSUME(ProfileKeyword, { LABEL: "diagramKind" });
    this.OPTION1(() => {
      this.CONSUME1(Identifier, { LABEL: "diagramName" });
    });
    this.MANY(() => {
      this.OR([
        { ALT: () => this.SUBRULE(this.stereotypeDeclaration) },
        { ALT: () => this.SUBRULE(this.metaclassDeclaration) },
        { ALT: () => this.SUBRULE(this.enumDeclaration) },
        { ALT: () => this.SUBRULE(this.profileFrameDeclaration) },
        { ALT: () => this.SUBRULE(this.extensionDeclaration) },
        {
          GATE: () => this.LA(2).tokenType === GeneralizationArrow,
          ALT: () => this.SUBRULE(this.generalizationDeclaration),
        },
      ]);
    });
  });

  private stereotypeDeclaration = this.RULE("stereotypeDeclaration", () => {
    this.CONSUME(StereotypeKeyword);
    this.CONSUME(Identifier, { LABEL: "stereotypeName" });
    this.OPTION2(() => {
      this.CONSUME(LCurly);
      this.MANY1(() => {
        this.SUBRULE(this.taggedValue);
      });
      this.CONSUME(RCurly);
    });
  });

  private taggedValue = this.RULE("taggedValue", () => {
    this.CONSUME(Identifier, { LABEL: "attributeName" });
    this.CONSUME(Colon);
    this.CONSUME1(Identifier, { LABEL: "typeName" });
  });

  private metaclassDeclaration = this.RULE("metaclassDeclaration", () => {
    this.CONSUME(MetaclassKeyword);
    this.CONSUME(Identifier, { LABEL: "metaclassName" });
  });

  private enumDeclaration = this.RULE("enumDeclaration", () => {
    this.CONSUME(EnumKeyword);
    this.CONSUME(Identifier, { LABEL: "enumName" });
    this.CONSUME(LCurly);
    this.MANY2(() => {
      this.CONSUME1(Identifier, { LABEL: "literal" });
    });
    this.CONSUME(RCurly);
  });

  private profileFrameDeclaration = this.RULE("profileFrameDeclaration", () => {
    this.CONSUME(ProfileKeyword);
    this.CONSUME(Identifier, { LABEL: "profileName" });
    this.OPTION3(() => {
      this.CONSUME(LCurly);
      this.CONSUME(RCurly);
    });
  });

  private extensionDeclaration = this.RULE("extensionDeclaration", () => {
    this.CONSUME(ExtensionKeyword);
    this.CONSUME(Identifier, { LABEL: "sourceName" });
    this.CONSUME(ExtensionArrow);
    this.CONSUME1(Identifier, { LABEL: "targetName" });
  });

  private generalizationDeclaration = this.RULE("generalizationDeclaration", () => {
    this.CONSUME(Identifier, { LABEL: "sourceName" });
    this.CONSUME(GeneralizationArrow);
    this.CONSUME1(Identifier, { LABEL: "targetName" });
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

class ProfileDslVisitor {
  visit(cst: CstNode): ProfileDiagramAst {
    const nameToken = cst.children.diagramName?.[0] as IToken | undefined;
    const stereotypes: AstStereotypeDeclaration[] = [];
    const metaclasses: AstMetaclassDeclaration[] = [];
    const profiles: AstProfileFrameDeclaration[] = [];
    const enumerations: AstProfileEnumeration[] = [];
    const relationships: AstProfileRelationship[] = [];

    for (const node of cst.children.stereotypeDeclaration ?? []) {
      stereotypes.push(this.visitStereotype(node as CstNode));
    }
    for (const node of cst.children.metaclassDeclaration ?? []) {
      metaclasses.push(this.visitMetaclass(node as CstNode));
    }
    for (const node of cst.children.profileFrameDeclaration ?? []) {
      profiles.push(this.visitProfileFrame(node as CstNode));
    }
    for (const node of cst.children.enumDeclaration ?? []) {
      enumerations.push(this.visitEnumeration(node as CstNode));
    }
    for (const node of cst.children.extensionDeclaration ?? []) {
      relationships.push(this.visitExtension(node as CstNode));
    }
    for (const node of cst.children.generalizationDeclaration ?? []) {
      relationships.push(this.visitGeneralization(node as CstNode));
    }

    const first = firstToken(cst);
    const last = lastToken(cst);
    const span = first !== undefined ? tokenSpan(first, last) : { start: 0, end: 0 };

    return {
      kind: "profile",
      name: nameToken?.image,
      stereotypes,
      metaclasses,
      profiles,
      enumerations,
      relationships,
      span,
    };
  }

  private visitStereotype(node: CstNode): AstStereotypeDeclaration {
    const nameToken = node.children.stereotypeName?.[0] as IToken;
    const attributes: AstTaggedValue[] = [];
    for (const item of node.children.taggedValue ?? []) {
      attributes.push(this.visitTaggedValue(item as CstNode));
    }
    return {
      name: nameToken.image,
      attributes,
      span: tokenSpan(nameToken, lastToken(node)),
    };
  }

  private visitTaggedValue(node: CstNode): AstTaggedValue {
    const nameToken = node.children.attributeName?.[0] as IToken;
    const typeToken = node.children.typeName?.[0] as IToken;
    return {
      name: nameToken.image,
      typeName: typeToken.image,
      span: tokenSpan(nameToken, typeToken),
    };
  }

  private visitMetaclass(node: CstNode): AstMetaclassDeclaration {
    const nameToken = node.children.metaclassName?.[0] as IToken;
    return {
      name: nameToken.image,
      span: tokenSpan(nameToken),
    };
  }

  private visitProfileFrame(node: CstNode): AstProfileFrameDeclaration {
    const nameToken = node.children.profileName?.[0] as IToken;
    return {
      name: nameToken.image,
      span: tokenSpan(nameToken, lastToken(node)),
    };
  }

  private visitEnumeration(node: CstNode): AstProfileEnumeration {
    const nameToken = node.children.enumName?.[0] as IToken;
    const literals = (node.children.literal ?? []).map((token) => (token as IToken).image);
    return {
      name: nameToken.image,
      literals,
      span: tokenSpan(nameToken, lastToken(node)),
    };
  }

  private visitExtension(node: CstNode): AstProfileRelationship {
    const sourceToken = node.children.sourceName?.[0] as IToken;
    const targetToken = node.children.targetName?.[0] as IToken;
    return {
      relationshipKind: "extension",
      sourceName: sourceToken.image,
      targetName: targetToken.image,
      span: tokenSpan(sourceToken, lastToken(node)),
    };
  }

  private visitGeneralization(node: CstNode): AstProfileRelationship {
    const sourceToken = node.children.sourceName?.[0] as IToken;
    const targetToken = node.children.targetName?.[0] as IToken;
    return {
      relationshipKind: "generalization",
      sourceName: sourceToken.image,
      targetName: targetToken.image,
      span: tokenSpan(sourceToken, lastToken(node)),
    };
  }
}

const parser = new ProfileDslParser();
const visitor = new ProfileDslVisitor();

export function parseProfileDocument(cst: CstNode): ProfileDiagramAst {
  return visitor.visit(cst);
}

export function parseProfileCst(text: string): {
  cst: CstNode;
  lexerErrors: ILexingError[];
  parserErrors: IRecognitionException[];
  comments: ReturnType<typeof commentsFromLexerGroups>;
} {
  const lexResult = profileLexer.tokenize(text);
  parser.input = lexResult.tokens;
  const cst = parser.document();

  return {
    cst,
    lexerErrors: lexResult.errors,
    parserErrors: parser.errors,
    comments: commentsFromLexerGroups(lexResult.groups),
  };
}
