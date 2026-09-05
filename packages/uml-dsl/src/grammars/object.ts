import { CstParser, type CstNode, type ILexingError, type IRecognitionException, type IToken } from "chevrotain";
import type { RelationshipType } from "@graphiq/uml-model";
import type {
  AstInstance,
  AstObjectRelationship,
  AstSlot,
  DslSpan,
  ObjectDiagramAst,
} from "../ast.js";
import { commentsFromLexerGroups } from "../comments.js";
import {
  Colon,
  DependencyArrow,
  DiagramKeyword,
  Equals,
  Identifier,
  InstanceKeyword,
  LCurly,
  LinkArrow,
  ObjectKeyword,
  RCurly,
  StringLiteral,
  objectLexer,
  objectTokens,
} from "../tokens/objectTokens.js";

export class ObjectDslParser extends CstParser {
  constructor() {
    super(objectTokens, { recoveryEnabled: true });
    this.performSelfAnalysis();
  }

  public document = this.RULE("document", () => {
    this.CONSUME(DiagramKeyword);
    this.CONSUME(ObjectKeyword, { LABEL: "diagramKind" });
    this.OPTION1(() => {
      this.CONSUME1(Identifier, { LABEL: "diagramName" });
    });
    this.MANY(() => {
      this.OR([
        { ALT: () => this.SUBRULE(this.instanceDeclaration) },
        { ALT: () => this.SUBRULE(this.relationshipDeclaration) },
      ]);
    });
  });

  private instanceDeclaration = this.RULE("instanceDeclaration", () => {
    this.CONSUME(InstanceKeyword);
    this.CONSUME(Identifier, { LABEL: "instanceName" });
    this.CONSUME(Colon);
    this.CONSUME1(Identifier, { LABEL: "classifierName" });
    this.OPTION(() => {
      this.SUBRULE(this.slotBody);
    });
  });

  private slotBody = this.RULE("slotBody", () => {
    this.CONSUME(LCurly);
    this.MANY(() => {
      this.SUBRULE(this.slot);
    });
    this.CONSUME(RCurly);
  });

  private slot = this.RULE("slot", () => {
    this.CONSUME(Identifier, { LABEL: "featureName" });
    this.CONSUME(Equals);
    this.OR([
      { ALT: () => this.CONSUME(StringLiteral, { LABEL: "slotValue" }) },
      { ALT: () => this.CONSUME1(Identifier, { LABEL: "slotValue" }) },
    ]);
  });

  private relationshipDeclaration = this.RULE("relationshipDeclaration", () => {
    this.CONSUME2(Identifier, { LABEL: "sourceName" });
    this.SUBRULE(this.relationshipArrow);
    this.CONSUME3(Identifier, { LABEL: "targetName" });
    this.OPTION1(() => {
      this.CONSUME2(Colon);
      this.CONSUME4(Identifier, { LABEL: "relationshipName" });
    });
  });

  private relationshipArrow = this.RULE("relationshipArrow", () => {
    this.OR([
      { ALT: () => this.CONSUME(DependencyArrow) },
      { ALT: () => this.CONSUME(LinkArrow) },
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

function slotValueFromNode(node: CstNode): string {
  const stringToken = node.children.slotValue?.[0] as IToken | undefined;
  if (stringToken === undefined) {
    return "";
  }
  if (stringToken.tokenType === StringLiteral) {
    return stringToken.image.slice(1, -1);
  }
  return stringToken.image;
}

function relationshipTypeFromArrow(node: CstNode): Extract<RelationshipType, "link" | "dependency"> {
  if (node.children.DependencyArrow) {
    return "dependency";
  }
  return "link";
}

class ObjectDslVisitor {
  visit(cst: CstNode): ObjectDiagramAst {
    const nameToken = cst.children.diagramName?.[0] as IToken | undefined;
    const instances: AstInstance[] = [];
    const relationships: AstObjectRelationship[] = [];

    for (const node of cst.children.instanceDeclaration ?? []) {
      const instance = this.visitInstance(node as CstNode);
      if (instance !== null) {
        instances.push(instance);
      }
    }

    for (const node of cst.children.relationshipDeclaration ?? []) {
      relationships.push(this.visitRelationship(node as CstNode));
    }

    const first = firstToken(cst);
    const last = lastToken(cst);
    const span =
      first !== undefined
        ? tokenSpan(first, last)
        : { start: 0, end: 0 };

    return {
      kind: "object",
      name: nameToken?.image,
      instances,
      relationships,
      span,
    };
  }

  private visitInstance(node: CstNode): AstInstance | null {
    const nameToken = node.children.instanceName?.[0] as IToken | undefined;
    const classifierToken = node.children.classifierName?.[0] as IToken | undefined;
    if (nameToken === undefined || classifierToken === undefined) {
      return null;
    }
    if (node.children.Colon === undefined) {
      return null;
    }
    const bodyNode = node.children.slotBody?.[0] as CstNode | undefined;
    const slots: AstSlot[] = [];

    if (bodyNode) {
      for (const slotNode of bodyNode.children.slot ?? []) {
        slots.push(this.visitSlot(slotNode as CstNode));
      }
    }

    return {
      name: nameToken.image,
      classifierName: classifierToken.image,
      slots,
      span: tokenSpan(nameToken, lastToken(node)),
    };
  }

  private visitSlot(node: CstNode): AstSlot {
    const featureToken = node.children.featureName?.[0] as IToken;
    return {
      featureName: featureToken.image,
      value: slotValueFromNode(node),
      span: tokenSpan(featureToken, lastToken(node)),
    };
  }

  private visitRelationship(node: CstNode): AstObjectRelationship {
    const sourceToken = node.children.sourceName?.[0] as IToken;
    const targetToken = node.children.targetName?.[0] as IToken;
    const nameToken = node.children.relationshipName?.[0] as IToken | undefined;
    const arrowNode = node.children.relationshipArrow?.[0] as CstNode;

    return {
      sourceName: sourceToken.image,
      targetName: targetToken.image,
      relationshipType: relationshipTypeFromArrow(arrowNode),
      name: nameToken?.image,
      span: tokenSpan(sourceToken, lastToken(node)),
    };
  }
}

const parser = new ObjectDslParser();
const visitor = new ObjectDslVisitor();

export function parseObjectDocument(cst: CstNode): ObjectDiagramAst {
  return visitor.visit(cst);
}

export function parseObjectCst(text: string): {
  cst: CstNode;
  lexerErrors: ILexingError[];
  parserErrors: IRecognitionException[];
  comments: ReturnType<typeof commentsFromLexerGroups>;
} {
  const lexResult = objectLexer.tokenize(text);
  parser.input = lexResult.tokens;
  const cst = parser.document();

  return {
    cst,
    lexerErrors: lexResult.errors,
    parserErrors: parser.errors,
    comments: commentsFromLexerGroups(lexResult.groups),
  };
}
