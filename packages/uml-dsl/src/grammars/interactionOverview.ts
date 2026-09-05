import {
  CstParser,
  type CstNode,
  type ILexingError,
  type IRecognitionException,
  type IToken,
} from "chevrotain";
import type {
  AstInteractionOverviewFlow,
  AstInteractionOverviewNode,
  AstInteractionOverviewNodeKind,
  DslSpan,
  InteractionOverviewDiagramAst,
} from "../ast.js";
import {
  Colon,
  DecisionKeyword,
  DiagramKeyword,
  FinalKeyword,
  FlowArrow,
  ForkKeyword,
  Identifier,
  InitialKeyword,
  InteractionOverviewKeyword,
  JoinKeyword,
  LBracket,
  MergeKeyword,
  RBracket,
  RefKeyword,
  interactionOverviewLexer,
  interactionOverviewTokens,
} from "../tokens/interactionOverviewTokens.js";

export class InteractionOverviewDslParser extends CstParser {
  constructor() {
    super(interactionOverviewTokens, { recoveryEnabled: true });
    this.performSelfAnalysis();
  }

  public document = this.RULE("document", () => {
    this.CONSUME(DiagramKeyword);
    this.CONSUME(InteractionOverviewKeyword, { LABEL: "diagramKind" });
    this.OPTION1(() => {
      this.CONSUME1(Identifier, { LABEL: "diagramName" });
    });
    this.MANY(() => {
      this.OR([
        {
          GATE: () => this.isFlowStart(),
          ALT: () => this.SUBRULE(this.flowDeclaration),
        },
        { ALT: () => this.SUBRULE(this.refDeclaration) },
        { ALT: () => this.SUBRULE(this.decisionDeclaration) },
        { ALT: () => this.SUBRULE(this.mergeDeclaration) },
        { ALT: () => this.SUBRULE(this.forkDeclaration) },
        { ALT: () => this.SUBRULE(this.joinDeclaration) },
        { ALT: () => this.SUBRULE(this.initialDeclaration) },
        { ALT: () => this.SUBRULE(this.finalDeclaration) },
      ]);
    });
  });

  private refDeclaration = this.RULE("refDeclaration", () => {
    this.CONSUME(RefKeyword);
    this.CONSUME(Identifier, { LABEL: "refName" });
  });

  private decisionDeclaration = this.RULE("decisionDeclaration", () => {
    this.CONSUME(DecisionKeyword);
    this.CONSUME(Identifier, { LABEL: "decisionName" });
  });

  private mergeDeclaration = this.RULE("mergeDeclaration", () => {
    this.CONSUME(MergeKeyword);
    this.CONSUME(Identifier, { LABEL: "mergeName" });
  });

  private forkDeclaration = this.RULE("forkDeclaration", () => {
    this.CONSUME(ForkKeyword);
    this.CONSUME(Identifier, { LABEL: "forkName" });
  });

  private joinDeclaration = this.RULE("joinDeclaration", () => {
    this.CONSUME(JoinKeyword);
    this.CONSUME(Identifier, { LABEL: "joinName" });
  });

  private initialDeclaration = this.RULE("initialDeclaration", () => {
    this.CONSUME(InitialKeyword);
    this.OPTION2(() => {
      this.CONSUME(Identifier, { LABEL: "initialName" });
    });
  });

  private finalDeclaration = this.RULE("finalDeclaration", () => {
    this.CONSUME(FinalKeyword);
    this.OPTION3(() => {
      this.CONSUME(Identifier, { LABEL: "finalName" });
    });
  });

  private flowDeclaration = this.RULE("flowDeclaration", () => {
    this.SUBRULE(this.flowEndpoint, { LABEL: "sourceEndpoint" });
    this.CONSUME(FlowArrow);
    this.SUBRULE1(this.flowEndpoint, { LABEL: "targetEndpoint" });
    this.OPTION4(() => {
      this.CONSUME(Colon);
      this.CONSUME(LBracket);
      this.CONSUME(Identifier, { LABEL: "guardName" });
      this.CONSUME(RBracket);
    });
  });

  private flowEndpoint = this.RULE("flowEndpoint", () => {
    this.OR2([
      { ALT: () => this.CONSUME(InitialKeyword, { LABEL: "endpoint" }) },
      { ALT: () => this.CONSUME(FinalKeyword, { LABEL: "endpoint" }) },
      {
        ALT: () => {
          this.CONSUME(RefKeyword);
          this.CONSUME(Identifier, { LABEL: "refName" });
        },
      },
      { ALT: () => this.CONSUME1(Identifier, { LABEL: "endpoint" }) },
    ]);
  });

  private isFlowStart(): boolean {
    const first = this.LA(1).tokenType;
    const second = this.LA(2).tokenType;
    const third = this.LA(3).tokenType;
    if (first === RefKeyword && second === Identifier && third === FlowArrow) {
      return true;
    }
    return (
      (first === Identifier || first === InitialKeyword || first === FinalKeyword) &&
      second === FlowArrow
    );
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

function namedNode(
  nodeKind: AstInteractionOverviewNodeKind,
  nameToken: IToken | undefined,
  fallbackName: string,
  node: CstNode,
): AstInteractionOverviewNode | null {
  const name = nameToken?.image ?? fallbackName;
  const first = firstToken(node);
  if (first === undefined) {
    return null;
  }
  return {
    nodeKind,
    name,
    span: tokenSpan(first, lastToken(node)),
  };
}

function visitEndpoint(node: CstNode | undefined): { name: string; isRef: boolean } | null {
  if (node === undefined) {
    return null;
  }
  const refName = node.children.refName?.[0] as IToken | undefined;
  if (refName !== undefined) {
    return { name: refName.image, isRef: true };
  }
  const endpoint = node.children.endpoint?.[0] as IToken | undefined;
  if (endpoint === undefined) {
    return null;
  }
  return { name: endpoint.image, isRef: false };
}

class InteractionOverviewDslVisitor {
  visit(cst: CstNode): InteractionOverviewDiagramAst {
    const nameToken = cst.children.diagramName?.[0] as IToken | undefined;
    const nodes: AstInteractionOverviewNode[] = [];
    const flows: AstInteractionOverviewFlow[] = [];

    this.collectNodes(cst, nodes);
    for (const node of cst.children.flowDeclaration ?? []) {
      const flow = this.visitFlow(node as CstNode);
      if (flow !== null) {
        flows.push(flow);
      }
    }

    const first = firstToken(cst);
    const last = lastToken(cst);
    const span = first !== undefined ? tokenSpan(first, last) : { start: 0, end: 0 };

    return {
      kind: "interactionOverview",
      name: nameToken?.image,
      nodes,
      flows,
      span,
    };
  }

  private collectNodes(parent: CstNode, nodes: AstInteractionOverviewNode[]): void {
    for (const node of parent.children.refDeclaration ?? []) {
      const refNode = namedNode(
        "interactionUse",
        (node as CstNode).children.refName?.[0] as IToken | undefined,
        "Interaction",
        node as CstNode,
      );
      if (refNode !== null) {
        nodes.push(refNode);
      }
    }
    for (const node of parent.children.decisionDeclaration ?? []) {
      const decision = namedNode(
        "decisionNode",
        (node as CstNode).children.decisionName?.[0] as IToken | undefined,
        "decision",
        node as CstNode,
      );
      if (decision !== null) {
        nodes.push(decision);
      }
    }
    for (const node of parent.children.mergeDeclaration ?? []) {
      const merge = namedNode(
        "mergeNode",
        (node as CstNode).children.mergeName?.[0] as IToken | undefined,
        "merge",
        node as CstNode,
      );
      if (merge !== null) {
        nodes.push(merge);
      }
    }
    for (const node of parent.children.forkDeclaration ?? []) {
      const fork = namedNode(
        "forkNode",
        (node as CstNode).children.forkName?.[0] as IToken | undefined,
        "fork",
        node as CstNode,
      );
      if (fork !== null) {
        nodes.push(fork);
      }
    }
    for (const node of parent.children.joinDeclaration ?? []) {
      const join = namedNode(
        "joinNode",
        (node as CstNode).children.joinName?.[0] as IToken | undefined,
        "join",
        node as CstNode,
      );
      if (join !== null) {
        nodes.push(join);
      }
    }
    for (const node of parent.children.initialDeclaration ?? []) {
      const initial = namedNode(
        "initialNode",
        (node as CstNode).children.initialName?.[0] as IToken | undefined,
        "initial",
        node as CstNode,
      );
      if (initial !== null) {
        nodes.push(initial);
      }
    }
    for (const node of parent.children.finalDeclaration ?? []) {
      const finalNode = namedNode(
        "activityFinalNode",
        (node as CstNode).children.finalName?.[0] as IToken | undefined,
        "final",
        node as CstNode,
      );
      if (finalNode !== null) {
        nodes.push(finalNode);
      }
    }
  }

  private visitFlow(node: CstNode): AstInteractionOverviewFlow | null {
    const source = visitEndpoint(node.children.sourceEndpoint?.[0] as CstNode | undefined);
    const target = visitEndpoint(node.children.targetEndpoint?.[0] as CstNode | undefined);
    if (source === null || target === null) {
      return null;
    }

    const first = firstToken(node);
    if (first === undefined) {
      return null;
    }

    const guardToken = node.children.guardName?.[0] as IToken | undefined;
    return {
      sourceName: source.name,
      targetName: target.name,
      sourceIsRef: source.isRef,
      targetIsRef: target.isRef,
      ...(guardToken !== undefined ? { guard: guardToken.image } : {}),
      span: tokenSpan(first, lastToken(node)),
    };
  }
}

const parser = new InteractionOverviewDslParser();
const visitor = new InteractionOverviewDslVisitor();

export function parseInteractionOverviewDocument(cst: CstNode): InteractionOverviewDiagramAst {
  return visitor.visit(cst);
}

export function parseInteractionOverviewCst(text: string): {
  cst: CstNode;
  lexerErrors: ILexingError[];
  parserErrors: IRecognitionException[];
} {
  const lexResult = interactionOverviewLexer.tokenize(text);
  parser.input = lexResult.tokens;
  const cst = parser.document();

  return {
    cst,
    lexerErrors: lexResult.errors,
    parserErrors: parser.errors,
  };
}
