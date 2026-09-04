import {
  CstParser,
  type CstNode,
  type ILexingError,
  type IRecognitionException,
  type IToken,
} from "chevrotain";
import type {
  AstSequenceLifeline,
  AstTimingMessage,
  AstTimingMessageSort,
  AstTimingState,
  AstTimingStateBlock,
  AstTimingStateConstraint,
  DslSpan,
  TimingDiagramAst,
} from "../ast.js";
import {
  AtSign,
  Colon,
  CreateArrow,
  DiagramKeyword,
  Identifier,
  LCurly,
  LifelineKeyword,
  MessageName,
  NumberLiteral,
  RangeDots,
  ReplyArrow,
  AsyncArrow,
  RCurly,
  SyncArrow,
  TimingKeyword,
  timingLexer,
  timingTokens,
} from "../tokens/timingTokens.js";

export class TimingDslParser extends CstParser {
  constructor() {
    super(timingTokens, { recoveryEnabled: true });
    this.performSelfAnalysis();
  }

  public document = this.RULE("document", () => {
    this.CONSUME(DiagramKeyword);
    this.CONSUME(TimingKeyword, { LABEL: "diagramKind" });
    this.OPTION1(() => {
      this.CONSUME1(Identifier, { LABEL: "diagramName" });
    });
    this.MANY(() => {
      this.OR([
        { ALT: () => this.SUBRULE(this.lifelineDeclaration) },
        { ALT: () => this.SUBRULE(this.stateBlockDeclaration) },
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

  private stateBlockDeclaration = this.RULE("stateBlockDeclaration", () => {
    this.CONSUME4(Identifier, { LABEL: "blockLifelineName" });
    this.CONSUME(LCurly);
    this.MANY1(() => {
      this.SUBRULE(this.stateDeclaration);
    });
    this.CONSUME(RCurly);
  });

  private stateDeclaration = this.RULE("stateDeclaration", () => {
    this.CONSUME5(Identifier, { LABEL: "stateName" });
    this.CONSUME(AtSign);
    this.CONSUME(NumberLiteral, { LABEL: "stateAt" });
    this.OPTION3(() => {
      this.SUBRULE(this.stateConstraint);
    });
  });

  private stateConstraint = this.RULE("stateConstraint", () => {
    this.CONSUME1(LCurly);
    this.OR1([
      {
        ALT: () => {
          this.CONSUME1(NumberLiteral, { LABEL: "durationMin" });
          this.CONSUME(RangeDots);
          this.CONSUME2(NumberLiteral, { LABEL: "durationMax" });
        },
      },
      {
        ALT: () => {
          this.CONSUME3(NumberLiteral, { LABEL: "timeConstraint" });
        },
      },
    ]);
    this.CONSUME2(RCurly);
  });

  private messageDeclaration = this.RULE("messageDeclaration", () => {
    this.CONSUME6(Identifier, { LABEL: "sourceName" });
    this.OR2([
      { ALT: () => this.CONSUME(ReplyArrow, { LABEL: "messageArrow" }) },
      { ALT: () => this.CONSUME(CreateArrow, { LABEL: "messageArrow" }) },
      { ALT: () => this.CONSUME(AsyncArrow, { LABEL: "messageArrow" }) },
      { ALT: () => this.CONSUME(SyncArrow, { LABEL: "messageArrow" }) },
    ]);
    this.CONSUME7(Identifier, { LABEL: "targetName" });
    this.CONSUME1(AtSign);
    this.CONSUME4(NumberLiteral, { LABEL: "messageAt" });
    this.OPTION4(() => {
      this.CONSUME1(Colon);
      this.OR3([
        { ALT: () => this.CONSUME(MessageName, { LABEL: "messageLabel" }) },
        { ALT: () => this.CONSUME8(Identifier, { LABEL: "messageLabel" }) },
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

function parseNumber(token: IToken | undefined): number {
  if (token === undefined) {
    return 0;
  }
  return Number(token.image);
}

function parseMessageSort(token: IToken | undefined): AstTimingMessageSort {
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

function parseConstraintNode(node: CstNode): AstTimingStateConstraint | undefined {
  const durationMin = node.children.durationMin?.[0] as IToken | undefined;
  const durationMax = node.children.durationMax?.[0] as IToken | undefined;
  const timeConstraint = node.children.timeConstraint?.[0] as IToken | undefined;

  if (durationMin !== undefined && durationMax !== undefined) {
    return {
      constraintKind: "duration",
      min: parseNumber(durationMin),
      max: parseNumber(durationMax),
      span: nodeSpan(node),
    };
  }

  if (timeConstraint !== undefined) {
    return {
      constraintKind: "time",
      time: parseNumber(timeConstraint),
      span: nodeSpan(node),
    };
  }

  return undefined;
}

function parseStateNode(node: CstNode): AstTimingState | null {
  const nameToken = node.children.stateName?.[0] as IToken | undefined;
  const atToken = node.children.stateAt?.[0] as IToken | undefined;
  if (nameToken === undefined || atToken === undefined) {
    return null;
  }

  const constraintNode = node.children.stateConstraint?.[0] as CstNode | undefined;
  const constraint =
    constraintNode !== undefined ? parseConstraintNode(constraintNode) : undefined;

  return {
    name: nameToken.image,
    at: parseNumber(atToken),
    ...(constraint !== undefined ? { constraint } : {}),
    span: nodeSpan(node),
  };
}

function parseStateBlockNode(node: CstNode): AstTimingStateBlock {
  const lifelineNameToken = node.children.blockLifelineName?.[0] as IToken;
  const stateNodes = node.children.stateDeclaration ?? [];

  return {
    lifelineName: lifelineNameToken.image,
    states: stateNodes
      .map((stateNode) => parseStateNode(stateNode as CstNode))
      .filter((state): state is AstTimingState => state !== null),
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

function parseMessageNode(node: CstNode): AstTimingMessage | null {
  const sourceToken = node.children.sourceName?.[0] as IToken | undefined;
  const targetToken = node.children.targetName?.[0] as IToken | undefined;
  const arrowToken = node.children.messageArrow?.[0] as IToken | undefined;
  const atToken = node.children.messageAt?.[0] as IToken | undefined;
  if (
    sourceToken === undefined ||
    targetToken === undefined ||
    arrowToken === undefined ||
    atToken === undefined
  ) {
    return null;
  }
  const labelToken = (node.children.messageLabel?.[0] as IToken | undefined)?.image;

  return {
    sourceName: sourceToken.image,
    targetName: targetToken.image,
    at: parseNumber(atToken),
    messageSort: parseMessageSort(arrowToken),
    ...(labelToken !== undefined ? { name: labelToken } : {}),
    span: nodeSpan(node),
  };
}

export function parseTimingDocument(cst: CstNode): TimingDiagramAst {
  const nameToken = cst.children.diagramName?.[0] as IToken | undefined;
  const lifelines: AstSequenceLifeline[] = [];
  const stateBlocks: AstTimingStateBlock[] = [];
  const messages: AstTimingMessage[] = [];

  for (const node of cst.children.lifelineDeclaration ?? []) {
    lifelines.push(parseLifelineNode(node as CstNode));
  }
  for (const node of cst.children.stateBlockDeclaration ?? []) {
    stateBlocks.push(parseStateBlockNode(node as CstNode));
  }
  for (const node of cst.children.messageDeclaration ?? []) {
    const message = parseMessageNode(node as CstNode);
    if (message !== null) {
      messages.push(message);
    }
  }

  return {
    kind: "timing",
    ...(nameToken !== undefined ? { name: nameToken.image } : {}),
    lifelines,
    stateBlocks,
    messages,
    span: nodeSpan(cst),
  };
}

const parser = new TimingDslParser();

export function parseTimingCst(text: string): {
  cst: CstNode;
  lexerErrors: ILexingError[];
  parserErrors: IRecognitionException[];
} {
  const { tokens, errors: lexerErrors } = timingLexer.tokenize(text);
  parser.input = tokens;
  const cst = parser.document();
  return {
    cst,
    lexerErrors,
    parserErrors: parser.errors,
  };
}
