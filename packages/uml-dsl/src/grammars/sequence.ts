import {
  CstParser,
  type CstNode,
  type ILexingError,
  type IRecognitionException,
  type IToken,
} from "chevrotain";
import type {
  AstSequenceCombinedFragment,
  AstSequenceCombinedFragmentOperand,
  AstSequenceCombinedFragmentOperator,
  AstSequenceLifeline,
  AstSequenceMessage,
  AstSequenceMessageSort,
  DslSpan,
  SequenceDiagramAst,
} from "../ast.js";
import { commentsFromLexerGroups } from "../comments.js";
import { guardNodes } from "../cstGuard.js";
import { optionalSameLineDiagramTitle, readDiagramTitle } from "../diagramTitle.js";
import {
  AltKeyword,
  AsyncArrow,
  Colon,
  CreateArrow,
  DiagramKeyword,
  Identifier,
  LBracket,
  LifelineKeyword,
  LoopKeyword,
  LCurly,
  MessageName,
  OptKeyword,
  QuotedLiteral,
  RBracket,
  ReplyArrow,
  RCurly,
  SequenceKeyword,
  SyncArrow,
  sequenceLexer,
  sequenceTokens,
} from "../tokens/sequenceTokens.js";

export class SequenceDslParser extends CstParser {
  constructor() {
    super(sequenceTokens, { recoveryEnabled: true });
    this.performSelfAnalysis();
  }

  public document = this.RULE("document", () => {
    this.CONSUME(DiagramKeyword);
    this.CONSUME(SequenceKeyword, { LABEL: "diagramKind" });
    optionalSameLineDiagramTitle(this, Identifier, QuotedLiteral);
    this.MANY(() => {
      this.OR([
        { ALT: () => this.SUBRULE(this.lifelineDeclaration) },
        { ALT: () => this.SUBRULE(this.combinedFragmentDeclaration) },
        { ALT: () => this.SUBRULE(this.messageDeclaration) },
      ]);
    });
  });

  private lifelineDeclaration = this.RULE("lifelineDeclaration", () => {
    this.CONSUME(LifelineKeyword);
    this.CONSUME2(Identifier, { LABEL: "lifelineName" });
    this.OPTION2(() => {
      this.CONSUME(Colon);
      this.CONSUME3(Identifier, { LABEL: "classifierName" });
    });
  });

  private combinedFragmentDeclaration = this.RULE("combinedFragmentDeclaration", () => {
    this.OR1([
      { ALT: () => this.CONSUME(AltKeyword, { LABEL: "fragmentOperator" }) },
      { ALT: () => this.CONSUME(OptKeyword, { LABEL: "fragmentOperator" }) },
      { ALT: () => this.CONSUME(LoopKeyword, { LABEL: "fragmentOperator" }) },
    ]);
    this.CONSUME(LCurly);
    this.MANY1(() => {
      this.SUBRULE(this.fragmentOperand);
    });
    this.CONSUME(RCurly);
  });

  private fragmentOperand = this.RULE("fragmentOperand", () => {
    this.OPTION3(() => {
      this.CONSUME(LBracket);
      this.CONSUME4(Identifier, { LABEL: "operandGuard" });
      this.CONSUME(RBracket);
    });
    this.AT_LEAST_ONE(() => {
      this.SUBRULE1(this.messageDeclaration);
    });
  });

  private messageDeclaration = this.RULE("messageDeclaration", () => {
    this.CONSUME5(Identifier, { LABEL: "sourceName" });
    this.OR2([
      { ALT: () => this.CONSUME(ReplyArrow, { LABEL: "messageArrow" }) },
      { ALT: () => this.CONSUME(CreateArrow, { LABEL: "messageArrow" }) },
      { ALT: () => this.CONSUME(AsyncArrow, { LABEL: "messageArrow" }) },
      { ALT: () => this.CONSUME(SyncArrow, { LABEL: "messageArrow" }) },
    ]);
    this.CONSUME6(Identifier, { LABEL: "targetName" });
    this.OPTION4(() => {
      this.CONSUME1(Colon);
      this.OR3([
        { ALT: () => this.CONSUME(MessageName, { LABEL: "messageLabel" }) },
        { ALT: () => this.CONSUME7(Identifier, { LABEL: "messageLabel" }) },
      ]);
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

function nodeSpan(node: CstNode | undefined): DslSpan {
  const start = firstToken(node);
  const end = lastToken(node);
  if (start === undefined) {
    return { start: 0, end: 0 };
  }
  return tokenSpan(start, end);
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
    const items = node.children[key];
    if (!items || items.length === 0) {
      continue;
    }
    const last = items[items.length - 1];
    if (last && typeof last === "object" && "children" in last) {
      const nested = lastToken(last as CstNode);
      if (nested !== undefined) {
        return nested;
      }
    }
    return last as IToken;
  }
  return undefined;
}

function parseMessageSort(token: IToken | undefined): AstSequenceMessageSort {
  switch (token?.tokenType) {
    case ReplyArrow:
      return "reply";
    case CreateArrow:
      return "createMessage";
    case AsyncArrow:
      return "asynchCall";
    case SyncArrow:
      return "synchCall";
    default:
      return "synchCall";
  }
}

function parseFragmentOperator(token: IToken | undefined): AstSequenceCombinedFragmentOperator {
  switch (token?.tokenType) {
    case OptKeyword:
      return "opt";
    case LoopKeyword:
      return "loop";
    case AltKeyword:
    default:
      return "alt";
  }
}

function parseMessageNode(node: CstNode): AstSequenceMessage | null {
  const sourceToken = node.children.sourceName?.[0] as IToken | undefined;
  const targetToken = node.children.targetName?.[0] as IToken | undefined;
  const arrowToken = node.children.messageArrow?.[0] as IToken | undefined;
  if (sourceToken === undefined || targetToken === undefined || arrowToken === undefined) {
    return null;
  }
  const labelToken = (node.children.messageLabel?.[0] as IToken | undefined)?.image;

  return {
    sourceName: sourceToken.image,
    sourceNameSpan: tokenSpan(sourceToken),
    targetName: targetToken.image,
    targetNameSpan: tokenSpan(targetToken),
    messageSort: parseMessageSort(arrowToken),
    ...(labelToken !== undefined ? { name: labelToken } : {}),
    span: nodeSpan(node),
  };
}

function parseOperandNode(node: CstNode): AstSequenceCombinedFragmentOperand {
  const guardToken = node.children.operandGuard?.[0] as IToken | undefined;
  const messageNodes = node.children.messageDeclaration ?? [];

  return {
    ...(guardToken !== undefined ? { guard: guardToken.image } : {}),
    messages: messageNodes
      .map((messageNode) => parseMessageNode(messageNode as CstNode))
      .filter((message): message is AstSequenceMessage => message !== null),
    span: nodeSpan(node),
  };
}

function parseFragmentNode(node: CstNode): AstSequenceCombinedFragment {
  const operatorToken = node.children.fragmentOperator?.[0] as IToken;
  const operandNodes = node.children.fragmentOperand ?? [];

  return {
    operator: parseFragmentOperator(operatorToken),
    operands: operandNodes.map((operandNode) => parseOperandNode(operandNode as CstNode)),
    span: nodeSpan(node),
  };
}

function parseLifelineNode(node: CstNode): AstSequenceLifeline | null {
  const nameToken = node.children.lifelineName?.[0] as IToken | undefined;
  if (nameToken === undefined) {
    return null;
  }
  const classifierToken = node.children.classifierName?.[0] as IToken | undefined;

  return {
    name: nameToken.image,
    ...(classifierToken !== undefined ? { classifierName: classifierToken.image } : {}),
    span: nodeSpan(node),
  };
}

function nodeOffset(node: CstNode): number {
  return firstToken(node)?.startOffset ?? Number.MAX_SAFE_INTEGER;
}

export function parseSequenceDocument(cst: CstNode): SequenceDiagramAst {
  const title = readDiagramTitle(cst.children.diagramName?.[0]);
  const lifelines = guardNodes(cst.children.lifelineDeclaration, parseLifelineNode).filter(
    (lifeline): lifeline is AstSequenceLifeline => lifeline !== null,
  );
  const combinedFragments = guardNodes(cst.children.combinedFragmentDeclaration, parseFragmentNode);
  const messages = guardNodes(cst.children.messageDeclaration, parseMessageNode).filter(
    (message): message is AstSequenceMessage => message !== null,
  );

  const interactionNodes = [
    ...(cst.children.combinedFragmentDeclaration ?? []).map((node) => ({
      interactionKind: "fragment" as const,
      node: node as CstNode,
    })),
    ...(cst.children.messageDeclaration ?? []).map((node) => ({
      interactionKind: "message" as const,
      node: node as CstNode,
    })),
  ].sort((left, right) => nodeOffset(left.node) - nodeOffset(right.node));

  const interactions: SequenceDiagramAst["interactions"] = [];
  for (const item of interactionNodes) {
    if (item.interactionKind === "fragment") {
      const fragment = guardVisitFragment(item.node);
      if (fragment !== undefined) {
        interactions.push({ interactionKind: "fragment", fragment });
      }
      continue;
    }
    const message = parseMessageNode(item.node);
    if (message !== null) {
      interactions.push({ interactionKind: "message", message });
    }
  }

  return {
    kind: "sequence",
    ...(title !== undefined ? { name: title } : {}),
    lifelines,
    combinedFragments,
    messages,
    interactions,
    span: nodeSpan(cst),
  };
}

function guardVisitFragment(node: CstNode): AstSequenceCombinedFragment | undefined {
  try {
    return parseFragmentNode(node);
  } catch (error) {
    if (error instanceof TypeError) {
      return undefined;
    }
    throw error;
  }
}

const parser = new SequenceDslParser();

export function parseSequenceCst(text: string): {
  cst: CstNode;
  lexerErrors: ILexingError[];
  parserErrors: IRecognitionException[];
  comments: ReturnType<typeof commentsFromLexerGroups>;
} {
  const lexResult = sequenceLexer.tokenize(text);
  const { errors: lexerErrors } = lexResult;
  parser.input = lexResult.tokens;
  const cst = parser.document();
  return {
    cst,
    lexerErrors,
    parserErrors: parser.errors,
    comments: commentsFromLexerGroups(lexResult.groups),
  };
}
