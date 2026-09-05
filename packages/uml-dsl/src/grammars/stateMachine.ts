import {
  CstParser,
  type CstNode,
  type ILexingError,
  type IRecognitionException,
  type IToken,
} from "chevrotain";
import type {
  AstPseudostateDeclaration,
  AstPseudostateKind,
  AstRegionDeclaration,
  AstStateDeclaration,
  AstStateMachineBodyItem,
  AstStateMachineTransition,
  DslSpan,
  StateMachineDiagramAst,
} from "../ast.js";
import { commentsFromLexerGroups } from "../comments.js";
import {
  BracketedGuard,
  ChoiceKeyword,
  Colon,
  DeepHistoryKeyword,
  DiagramKeyword,
  DoKeyword,
  EntryKeyword,
  ExitKeyword,
  ForkKeyword,
  HistoryKeyword,
  Identifier,
  JoinKeyword,
  JunctionKeyword,
  LCurly,
  RCurly,
  RegionKeyword,
  Slash,
  StarVertex,
  StateKeyword,
  StateMachineKeyword,
  TerminateKeyword,
  TransitionArrow,
  stateMachineLexer,
  stateMachineTokens,
} from "../tokens/stateMachineTokens.js";

export class StateMachineDslParser extends CstParser {
  constructor() {
    super(stateMachineTokens, { recoveryEnabled: true });
    this.performSelfAnalysis();
  }

  public document = this.RULE("document", () => {
    this.CONSUME(DiagramKeyword);
    this.CONSUME(StateMachineKeyword, { LABEL: "diagramKind" });
    this.OPTION1(() => {
      this.CONSUME1(Identifier, { LABEL: "diagramName" });
    });
    this.MANY(() => {
      this.OR([
        { ALT: () => this.SUBRULE(this.stateDeclaration) },
        { ALT: () => this.SUBRULE(this.pseudostateDeclaration) },
        {
          GATE: () => this.isTransitionStart(),
          ALT: () => this.SUBRULE(this.transitionDeclaration),
        },
      ]);
    });
  });

  private stateDeclaration = this.RULE("stateDeclaration", () => {
    this.CONSUME(StateKeyword);
    this.CONSUME2(Identifier, { LABEL: "stateName" });
    this.CONSUME(LCurly);
    this.OPTION2(() => {
      this.CONSUME(EntryKeyword);
      this.CONSUME(Slash);
      this.CONSUME3(Identifier, { LABEL: "entryEffect" });
    });
    this.OPTION3(() => {
      this.CONSUME(DoKeyword);
      this.CONSUME2(Slash);
      this.CONSUME4(Identifier, { LABEL: "doActivity" });
    });
    this.OPTION4(() => {
      this.CONSUME(ExitKeyword);
      this.CONSUME3(Slash);
      this.CONSUME5(Identifier, { LABEL: "exitEffect" });
    });
    this.MANY1(() => {
      this.OR1([
        { ALT: () => this.SUBRULE1(this.regionDeclaration) },
        { ALT: () => this.SUBRULE1(this.nestedStateDeclaration) },
        { ALT: () => this.SUBRULE1(this.pseudostateDeclaration) },
        {
          GATE: () => this.isTransitionStart(),
          ALT: () => this.SUBRULE1(this.transitionDeclaration),
        },
      ]);
    });
    this.CONSUME(RCurly);
  });

  private nestedStateDeclaration = this.RULE("nestedStateDeclaration", () => {
    this.CONSUME1(StateKeyword);
    this.CONSUME6(Identifier, { LABEL: "nestedStateName" });
    this.OPTION5(() => {
      this.CONSUME2(LCurly);
      this.MANY2(() => {
        this.OR2([
          { ALT: () => this.SUBRULE2(this.pseudostateDeclaration) },
          {
            GATE: () => this.isTransitionStart(),
            ALT: () => this.SUBRULE2(this.transitionDeclaration),
          },
        ]);
      });
      this.CONSUME2(RCurly);
    });
  });

  private regionDeclaration = this.RULE("regionDeclaration", () => {
    this.CONSUME(RegionKeyword);
    this.CONSUME7(Identifier, { LABEL: "regionName" });
    this.CONSUME3(LCurly);
    this.MANY3(() => {
      this.OR3([
        { ALT: () => this.SUBRULE3(this.nestedStateDeclaration) },
        { ALT: () => this.SUBRULE3(this.pseudostateDeclaration) },
        {
          GATE: () => this.isTransitionStart(),
          ALT: () => this.SUBRULE3(this.transitionDeclaration),
        },
      ]);
    });
    this.CONSUME4(RCurly);
  });

  private pseudostateDeclaration = this.RULE("pseudostateDeclaration", () => {
    this.OR4([
      { ALT: () => this.CONSUME(ChoiceKeyword) },
      { ALT: () => this.CONSUME(JunctionKeyword) },
      { ALT: () => this.CONSUME(ForkKeyword) },
      { ALT: () => this.CONSUME(JoinKeyword) },
      { ALT: () => this.CONSUME(HistoryKeyword) },
      { ALT: () => this.CONSUME(DeepHistoryKeyword) },
      { ALT: () => this.CONSUME(TerminateKeyword) },
    ]);
    this.OPTION6(() => {
      this.CONSUME8(Identifier, { LABEL: "pseudostateName" });
    });
  });

  private transitionDeclaration = this.RULE("transitionDeclaration", () => {
    this.SUBRULE(this.transitionEndpoint, { LABEL: "sourceEndpoint" });
    this.CONSUME(TransitionArrow);
    this.SUBRULE1(this.transitionEndpoint, { LABEL: "targetEndpoint" });
    this.OPTION7(() => {
      this.CONSUME(Colon);
      this.SUBRULE(this.transitionLabel);
    });
  });

  private transitionLabel = this.RULE("transitionLabel", () => {
    this.OPTION1(() => {
      this.CONSUME(Identifier, { LABEL: "triggerName" });
    });
    this.OPTION2(() => {
      this.CONSUME(BracketedGuard, { LABEL: "guardBody" });
    });
    this.OPTION3(() => {
      this.CONSUME(Slash);
      this.CONSUME2(Identifier, { LABEL: "effectName" });
    });
  });

  private transitionEndpoint = this.RULE("transitionEndpoint", () => {
    this.OR5([
      { ALT: () => this.CONSUME(StarVertex, { LABEL: "endpoint" }) },
      { ALT: () => this.CONSUME1(Identifier, { LABEL: "endpoint" }) },
    ]);
  });

  private isTransitionStart(): boolean {
    const first = this.LA(1).tokenType;
    const second = this.LA(2).tokenType;
    return (first === StarVertex || first === Identifier) && second === TransitionArrow;
  }
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

function endpointFromNode(node: CstNode | undefined): { name: string; isStar: boolean } | null {
  const token = node?.children.endpoint?.[0] as IToken | undefined;
  if (token === undefined) {
    return null;
  }
  if (token.tokenType === StarVertex) {
    return { name: "[*]", isStar: true };
  }
  return { name: token.image, isStar: false };
}

function pseudostateKindFromNode(node: CstNode): AstPseudostateKind {
  if (node.children.ChoiceKeyword !== undefined) {
    return "choice";
  }
  if (node.children.JunctionKeyword !== undefined) {
    return "junction";
  }
  if (node.children.ForkKeyword !== undefined) {
    return "fork";
  }
  if (node.children.JoinKeyword !== undefined) {
    return "join";
  }
  if (node.children.HistoryKeyword !== undefined) {
    return "shallowHistory";
  }
  if (node.children.DeepHistoryKeyword !== undefined) {
    return "deepHistory";
  }
  return "terminate";
}

function defaultPseudostateName(kind: AstPseudostateKind): string {
  switch (kind) {
    case "choice":
      return "choice";
    case "junction":
      return "junction";
    case "fork":
      return "fork";
    case "join":
      return "join";
    case "shallowHistory":
      return "history";
    case "deepHistory":
      return "deepHistory";
    case "terminate":
      return "terminate";
    default: {
      const unreachable: never = kind;
      throw new Error(`Unhandled pseudostate kind: ${String(unreachable)}`);
    }
  }
}

class StateMachineDslVisitor {
  visit(cst: CstNode): StateMachineDiagramAst {
    const nameToken = cst.children.diagramName?.[0] as IToken | undefined;
    const items: AstStateMachineBodyItem[] = [];
    const transitions: AstStateMachineTransition[] = [];

    for (const node of cst.children.stateDeclaration ?? []) {
      const state = this.visitState(node as CstNode);
      if (state !== null) {
        items.push({ itemKind: "state", state });
      }
    }
    for (const node of cst.children.pseudostateDeclaration ?? []) {
      const pseudostate = this.visitPseudostate(node as CstNode);
      if (pseudostate !== null) {
        items.push({ itemKind: "pseudostate", pseudostate });
      }
    }
    for (const node of cst.children.transitionDeclaration ?? []) {
      const transition = this.visitTransition(node as CstNode);
      if (transition !== null) {
        transitions.push(transition);
      }
    }

    const first = firstToken(cst);
    const last = lastToken(cst);
    const span = first !== undefined ? tokenSpan(first, last) : { start: 0, end: 0 };

    return {
      kind: "stateMachine",
      name: nameToken?.image,
      items,
      transitions,
      span,
    };
  }

  private visitState(node: CstNode): AstStateDeclaration | null {
    const nameToken = node.children.stateName?.[0] as IToken | undefined;
    const first = firstToken(node);
    if (nameToken === undefined || first === undefined) {
      return null;
    }

    const entryToken = node.children.entryEffect?.[0] as IToken | undefined;
    const doToken = node.children.doActivity?.[0] as IToken | undefined;
    const exitToken = node.children.exitEffect?.[0] as IToken | undefined;

    return {
      name: nameToken.image,
      ...(entryToken !== undefined ? { entry: entryToken.image } : {}),
      ...(doToken !== undefined ? { do: doToken.image } : {}),
      ...(exitToken !== undefined ? { exit: exitToken.image } : {}),
      items: this.visitBodyItems(node),
      span: tokenSpan(first, lastToken(node)),
    };
  }

  private visitNestedState(node: CstNode): AstStateDeclaration | null {
    const nameToken = node.children.nestedStateName?.[0] as IToken | undefined;
    const first = firstToken(node);
    if (nameToken === undefined || first === undefined) {
      return null;
    }

    const hasBody = (node.children.LCurly?.length ?? 0) > 0;
    return {
      name: nameToken.image,
      items: hasBody ? this.visitBodyItems(node) : [],
      span: tokenSpan(first, lastToken(node)),
    };
  }

  private visitRegion(node: CstNode): AstRegionDeclaration | null {
    const nameToken = node.children.regionName?.[0] as IToken | undefined;
    const first = firstToken(node);
    if (nameToken === undefined || first === undefined) {
      return null;
    }

    return {
      name: nameToken.image,
      items: this.visitBodyItems(node),
      span: tokenSpan(first, lastToken(node)),
    };
  }

  private visitPseudostate(node: CstNode): AstPseudostateDeclaration | null {
    const first = firstToken(node);
    if (first === undefined) {
      return null;
    }
    const kind = pseudostateKindFromNode(node);
    const nameToken = node.children.pseudostateName?.[0] as IToken | undefined;
    const name = nameToken?.image ?? defaultPseudostateName(kind);
    return {
      pseudostateKind: kind,
      name,
      span: tokenSpan(first, lastToken(node)),
    };
  }

  private visitTransition(node: CstNode): AstStateMachineTransition | null {
    const source = endpointFromNode(node.children.sourceEndpoint?.[0] as CstNode | undefined);
    const target = endpointFromNode(node.children.targetEndpoint?.[0] as CstNode | undefined);
    if (source === null || target === null) {
      return null;
    }

    const triggerToken =
      (node.children.transitionLabel?.[0] as CstNode | undefined)?.children.triggerName?.[0] as
        | IToken
        | undefined;
    const guardToken =
      (node.children.transitionLabel?.[0] as CstNode | undefined)?.children.guardBody?.[0] as
        | IToken
        | undefined;
    const effectToken =
      (node.children.transitionLabel?.[0] as CstNode | undefined)?.children.effectName?.[0] as
        | IToken
        | undefined;
    const first = firstToken(node);
    if (first === undefined) {
      return null;
    }

    return {
      sourceName: source.name,
      targetName: target.name,
      sourceIsStar: source.isStar,
      targetIsStar: target.isStar,
      ...(triggerToken !== undefined ? { trigger: triggerToken.image } : {}),
      ...(guardToken !== undefined
        ? { guard: guardToken.image.slice(1, -1).trim() }
        : {}),
      ...(effectToken !== undefined ? { effect: effectToken.image } : {}),
      span: tokenSpan(first, lastToken(node)),
    };
  }

  private visitBodyItems(parent: CstNode): AstStateMachineBodyItem[] {
    const items: AstStateMachineBodyItem[] = [];

    for (const node of parent.children.regionDeclaration ?? []) {
      const region = this.visitRegion(node as CstNode);
      if (region !== null) {
        items.push({ itemKind: "region", region });
      }
    }
    for (const node of parent.children.nestedStateDeclaration ?? []) {
      const state = this.visitNestedState(node as CstNode);
      if (state !== null) {
        items.push({ itemKind: "state", state });
      }
    }
    for (const node of parent.children.pseudostateDeclaration ?? []) {
      const pseudostate = this.visitPseudostate(node as CstNode);
      if (pseudostate !== null) {
        items.push({ itemKind: "pseudostate", pseudostate });
      }
    }
    for (const node of parent.children.transitionDeclaration ?? []) {
      const transition = this.visitTransition(node as CstNode);
      if (transition !== null) {
        items.push({ itemKind: "transition", transition });
      }
    }

    return items;
  }
}

const parser = new StateMachineDslParser();
const visitor = new StateMachineDslVisitor();

export function parseStateMachineDocument(cst: CstNode): StateMachineDiagramAst {
  return visitor.visit(cst);
}

export function parseStateMachineCst(text: string): {
  cst: CstNode;
  lexerErrors: ILexingError[];
  parserErrors: IRecognitionException[];
  comments: ReturnType<typeof commentsFromLexerGroups>;
} {
  const lexResult = stateMachineLexer.tokenize(text);
  parser.input = lexResult.tokens;
  const cst = parser.document();

  return {
    cst,
    lexerErrors: lexResult.errors,
    parserErrors: parser.errors,
    comments: commentsFromLexerGroups(lexResult.groups),
  };
}
