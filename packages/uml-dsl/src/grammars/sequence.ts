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
    this.OPTION1(() => {
      this.CONSUME1(Identifier, { LABEL: "diagramName" });
    });
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
    targetName: targetToken.image,
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

function parseLifelineNode(node: CstNode): AstSequenceLifeline {
  const nameToken = node.children.lifelineName?.[0] as IToken;
  const classifierToken = node.children.classifierName?.[0] as IToken | undefined;

  return {
    name: nameToken.image,
    ...(classifierToken !== undefined ? { classifierName: classifierToken.image } : {}),
    span: nodeSpan(node),
  };
}

export function parseSequenceDocument(cst: CstNode): SequenceDiagramAst {
  const nameToken = cst.children.diagramName?.[0] as IToken | undefined;
  const lifelines: AstSequenceLifeline[] = [];
  const combinedFragments: AstSequenceCombinedFragment[] = [];
  const messages: AstSequenceMessage[] = [];

  for (const node of cst.children.lifelineDeclaration ?? []) {
    lifelines.push(parseLifelineNode(node as CstNode));
  }
  for (const node of cst.children.combinedFragmentDeclaration ?? []) {
    combinedFragments.push(parseFragmentNode(node as CstNode));
  }
  for (const node of cst.children.messageDeclaration ?? []) {
    const message = parseMessageNode(node as CstNode);
    if (message !== null) {
      messages.push(message);
    }
  }

  return {
    kind: "sequence",
    ...(nameToken !== undefined ? { name: nameToken.image } : {}),
    lifelines,
    combinedFragments,
    messages,
    span: nodeSpan(cst),
  };
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
