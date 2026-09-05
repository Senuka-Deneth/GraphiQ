import { CstParser, type CstNode, type ILexingError, type IRecognitionException, type IToken } from "chevrotain";
import type {
  AstCommunicationMessage,
  AstInstance,
  AstSlot,
  CommunicationDiagramAst,
  DslSpan,
} from "../ast.js";
import { commentsFromLexerGroups } from "../comments.js";
import {
  Colon,
  CommunicationKeyword,
  DiagramKeyword,
  Equals,
  Identifier,
  InstanceKeyword,
  LCurly,
  LinkArrow,
  MessageArrow,
  MessageName,
  RCurly,
  SequenceNumber,
  StringLiteral,
  communicationLexer,
  communicationTokens,
} from "../tokens/communicationTokens.js";

export class CommunicationDslParser extends CstParser {
  constructor() {
    super(communicationTokens, { recoveryEnabled: true });
    this.performSelfAnalysis();
  }

  public document = this.RULE("document", () => {
    this.CONSUME(DiagramKeyword);
    this.CONSUME(CommunicationKeyword, { LABEL: "diagramKind" });
    this.OPTION1(() => {
      this.CONSUME1(Identifier, { LABEL: "diagramName" });
    });
    this.MANY(() => {
      this.OR([
        { ALT: () => this.SUBRULE(this.instanceDeclaration) },
        { ALT: () => this.SUBRULE(this.messageDeclaration) },
        { ALT: () => this.SUBRULE(this.linkDeclaration) },
      ]);
    });
  });

  private instanceDeclaration = this.RULE("instanceDeclaration", () => {
    this.CONSUME(InstanceKeyword);
    this.CONSUME(Identifier, { LABEL: "instanceName" });
    this.CONSUME(Colon);
    this.CONSUME1(Identifier, { LABEL: "classifierName" });
    this.OPTION2(() => {
      this.SUBRULE(this.slotBody);
    });
  });

  private slotBody = this.RULE("slotBody", () => {
    this.CONSUME(LCurly);
    this.MANY1(() => {
      this.SUBRULE(this.slot);
    });
    this.CONSUME(RCurly);
  });

  private slot = this.RULE("slot", () => {
    this.CONSUME4(Identifier, { LABEL: "featureName" });
    this.CONSUME(Equals);
    this.OR([
      { ALT: () => this.CONSUME(StringLiteral, { LABEL: "slotValue" }) },
      { ALT: () => this.CONSUME5(Identifier, { LABEL: "slotValue" }) },
    ]);
  });

  private messageDeclaration = this.RULE("messageDeclaration", () => {
    this.CONSUME6(Identifier, { LABEL: "sourceName" });
    this.CONSUME(MessageArrow);
    this.CONSUME7(Identifier, { LABEL: "targetName" });
    this.CONSUME1(Colon);
    this.CONSUME(SequenceNumber, { LABEL: "sequenceNumber" });
    this.OPTION3(() => {
      this.CONSUME2(Colon);
      this.OR([
        { ALT: () => this.CONSUME(MessageName, { LABEL: "messageName" }) },
        { ALT: () => this.CONSUME2(Identifier, { LABEL: "messageName" }) },
      ]);
    });
  });

  private linkDeclaration = this.RULE("linkDeclaration", () => {
    this.CONSUME8(Identifier, { LABEL: "linkSourceName" });
    this.CONSUME(LinkArrow);
    this.CONSUME9(Identifier, { LABEL: "linkTargetName" });
    this.OPTION4(() => {
      this.CONSUME3(Colon);
      this.CONSUME(Identifier, { LABEL: "linkName" });
    });
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

function slotValue(token: IToken): string {
  if (token.tokenType.name === "StringLiteral") {
    return token.image.slice(1, -1);
  }
  return token.image;
}

class CommunicationDslVisitor {
  visit(cst: CstNode): CommunicationDiagramAst {
    const nameToken = cst.children.diagramName?.[0] as IToken | undefined;
    const instances: AstInstance[] = [];
    const messages: AstCommunicationMessage[] = [];
    const links: CommunicationDiagramAst["links"] = [];

    for (const node of cst.children.instanceDeclaration ?? []) {
      const instance = this.visitInstance(node as CstNode);
      if (instance !== null) {
        instances.push(instance);
      }
    }

    for (const node of cst.children.messageDeclaration ?? []) {
      messages.push(this.visitMessage(node as CstNode));
    }

    for (const node of cst.children.linkDeclaration ?? []) {
      links.push(this.visitLink(node as CstNode));
    }

    const first = firstToken(cst);
    const last = lastToken(cst);
    const span = first !== undefined ? tokenSpan(first, last) : { start: 0, end: 0 };

    return {
      kind: "communication",
      name: nameToken?.image,
      instances,
      messages,
      links,
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

    const slots: AstSlot[] = [];

    for (const slotNode of node.children.slot ?? []) {
      const slot = slotNode as CstNode;
      const featureToken = slot.children.featureName?.[0] as IToken;
      const valueToken = slot.children.slotValue?.[0] as IToken;
      slots.push({
        featureName: featureToken.image,
        value: slotValue(valueToken),
        span: tokenSpan(featureToken, valueToken),
      });
    }

    return {
      name: nameToken.image,
      classifierName: classifierToken.image,
      slots,
      span: tokenSpan(nameToken, lastToken(node)),
    };
  }

  private visitMessage(node: CstNode): AstCommunicationMessage {
    const sourceToken = node.children.sourceName?.[0] as IToken;
    const targetToken = node.children.targetName?.[0] as IToken;
    const sequenceToken = node.children.sequenceNumber?.[0] as IToken;
    const messageNameToken = node.children.messageName?.[0] as IToken | undefined;

    return {
      sourceName: sourceToken.image,
      targetName: targetToken.image,
      sequenceNumber: sequenceToken.image,
      messageName: messageNameToken?.image,
      span: tokenSpan(sourceToken, lastToken(node)),
    };
  }

  private visitLink(node: CstNode): CommunicationDiagramAst["links"][number] {
    const sourceToken = node.children.linkSourceName?.[0] as IToken;
    const targetToken = node.children.linkTargetName?.[0] as IToken;
    const nameToken = node.children.linkName?.[0] as IToken | undefined;

    return {
      sourceName: sourceToken.image,
      targetName: targetToken.image,
      name: nameToken?.image,
      span: tokenSpan(sourceToken, lastToken(node)),
    };
  }
}

const parser = new CommunicationDslParser();
const visitor = new CommunicationDslVisitor();

export function parseCommunicationDocument(cst: CstNode): CommunicationDiagramAst {
  return visitor.visit(cst);
}

export function parseCommunicationCst(text: string): {
  cst: CstNode;
  lexerErrors: ILexingError[];
  parserErrors: IRecognitionException[];
  comments: ReturnType<typeof commentsFromLexerGroups>;
} {
  const lexResult = communicationLexer.tokenize(text);
  parser.input = lexResult.tokens;
  const cst = parser.document();

  return {
    cst,
    lexerErrors: lexResult.errors,
    parserErrors: parser.errors,
    comments: commentsFromLexerGroups(lexResult.groups),
  };
}
