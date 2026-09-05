import {
  CstParser,
  type CstNode,
  type ILexingError,
  type IRecognitionException,
  type IToken,
} from "chevrotain";
import type {
  ActivityDiagramAst,
  AstActivityBodyItem,
  AstActivityFlow,
  AstActivityInterruptible,
  AstActivityNode,
  AstActivityNodeKind,
  AstActivityPartition,
  DslSpan,
} from "../ast.js";
import { commentsFromLexerGroups } from "../comments.js";
import {
  ActionKeyword,
  ActivityKeyword,
  Colon,
  DecisionKeyword,
  DiagramKeyword,
  FinalKeyword,
  FlowArrow,
  FlowFinalKeyword,
  ForkKeyword,
  Identifier,
  InitialKeyword,
  InterruptibleKeyword,
  JoinKeyword,
  LBracket,
  LCurly,
  MergeKeyword,
  ObjectKeyword,
  PartitionKeyword,
  RBracket,
  RCurly,
  activityLexer,
  activityTokens,
} from "../tokens/activityTokens.js";

export class ActivityDslParser extends CstParser {
  constructor() {
    super(activityTokens, { recoveryEnabled: true });
    this.performSelfAnalysis();
  }

  public document = this.RULE("document", () => {
    this.CONSUME(DiagramKeyword);
    this.CONSUME(ActivityKeyword, { LABEL: "diagramKind" });
    this.OPTION1(() => {
      this.CONSUME1(Identifier, { LABEL: "diagramName" });
    });
    this.MANY(() => {
      this.OR([
        { ALT: () => this.SUBRULE(this.partitionDeclaration) },
        { ALT: () => this.SUBRULE(this.interruptibleDeclaration) },
        { ALT: () => this.SUBRULE(this.actionDeclaration) },
        { ALT: () => this.SUBRULE(this.objectDeclaration) },
        { ALT: () => this.SUBRULE(this.decisionDeclaration) },
        { ALT: () => this.SUBRULE(this.mergeDeclaration) },
        { ALT: () => this.SUBRULE(this.forkDeclaration) },
        { ALT: () => this.SUBRULE(this.joinDeclaration) },
        {
          GATE: () => this.isFlowStart(),
          ALT: () => this.SUBRULE(this.flowDeclaration),
        },
        { ALT: () => this.SUBRULE(this.flowFinalDeclaration) },
        { ALT: () => this.SUBRULE(this.initialDeclaration) },
        { ALT: () => this.SUBRULE(this.finalDeclaration) },
      ]);
    });
  });

  private partitionDeclaration = this.RULE("partitionDeclaration", () => {
    this.CONSUME(PartitionKeyword);
    this.CONSUME2(Identifier, { LABEL: "partitionName" });
    this.CONSUME(LCurly);
    this.MANY1(() => {
      this.OR1([
        { ALT: () => this.SUBRULE1(this.nestedPartitionDeclaration) },
        { ALT: () => this.SUBRULE1(this.interruptibleDeclaration) },
        { ALT: () => this.SUBRULE1(this.actionDeclaration) },
        { ALT: () => this.SUBRULE1(this.objectDeclaration) },
        { ALT: () => this.SUBRULE1(this.decisionDeclaration) },
        { ALT: () => this.SUBRULE1(this.mergeDeclaration) },
        { ALT: () => this.SUBRULE1(this.forkDeclaration) },
        { ALT: () => this.SUBRULE1(this.joinDeclaration) },
        { ALT: () => this.SUBRULE1(this.flowFinalDeclaration) },
        { ALT: () => this.SUBRULE1(this.initialDeclaration) },
        { ALT: () => this.SUBRULE1(this.finalDeclaration) },
      ]);
    });
    this.CONSUME(RCurly);
  });

  private nestedPartitionDeclaration = this.RULE("nestedPartitionDeclaration", () => {
    this.CONSUME1(PartitionKeyword);
    this.CONSUME(Identifier, { LABEL: "nestedPartitionName" });
    this.CONSUME2(LCurly);
    this.MANY3(() => {
      this.OR3([
        { ALT: () => this.SUBRULE2(this.actionDeclaration) },
        { ALT: () => this.SUBRULE2(this.objectDeclaration) },
        { ALT: () => this.SUBRULE2(this.decisionDeclaration) },
        { ALT: () => this.SUBRULE2(this.mergeDeclaration) },
        { ALT: () => this.SUBRULE2(this.forkDeclaration) },
        { ALT: () => this.SUBRULE2(this.joinDeclaration) },
        { ALT: () => this.SUBRULE2(this.flowFinalDeclaration) },
        { ALT: () => this.SUBRULE2(this.initialDeclaration) },
        { ALT: () => this.SUBRULE2(this.finalDeclaration) },
      ]);
    });
    this.CONSUME2(RCurly);
  });

  private interruptibleDeclaration = this.RULE("interruptibleDeclaration", () => {
    this.CONSUME(InterruptibleKeyword);
    this.CONSUME3(Identifier, { LABEL: "interruptibleName" });
    this.CONSUME1(LCurly);
    this.MANY2(() => {
      this.OR4([
        { ALT: () => this.SUBRULE3(this.actionDeclaration) },
        { ALT: () => this.SUBRULE3(this.objectDeclaration) },
        { ALT: () => this.SUBRULE3(this.decisionDeclaration) },
        { ALT: () => this.SUBRULE3(this.mergeDeclaration) },
        { ALT: () => this.SUBRULE3(this.forkDeclaration) },
        { ALT: () => this.SUBRULE3(this.joinDeclaration) },
        { ALT: () => this.SUBRULE3(this.flowFinalDeclaration) },
        { ALT: () => this.SUBRULE3(this.initialDeclaration) },
        { ALT: () => this.SUBRULE3(this.finalDeclaration) },
      ]);
    });
    this.CONSUME1(RCurly);
  });

  private actionDeclaration = this.RULE("actionDeclaration", () => {
    this.CONSUME(ActionKeyword);
    this.CONSUME4(Identifier, { LABEL: "actionName" });
  });

  private objectDeclaration = this.RULE("objectDeclaration", () => {
    this.CONSUME(ObjectKeyword);
    this.CONSUME5(Identifier, { LABEL: "objectName" });
  });

  private decisionDeclaration = this.RULE("decisionDeclaration", () => {
    this.CONSUME(DecisionKeyword);
    this.OPTION2(() => {
      this.CONSUME6(Identifier, { LABEL: "decisionName" });
    });
  });

  private mergeDeclaration = this.RULE("mergeDeclaration", () => {
    this.CONSUME(MergeKeyword);
    this.OPTION3(() => {
      this.CONSUME7(Identifier, { LABEL: "mergeName" });
    });
  });

  private forkDeclaration = this.RULE("forkDeclaration", () => {
    this.CONSUME(ForkKeyword);
    this.OPTION4(() => {
      this.CONSUME8(Identifier, { LABEL: "forkName" });
    });
  });

  private joinDeclaration = this.RULE("joinDeclaration", () => {
    this.CONSUME(JoinKeyword);
    this.OPTION5(() => {
      this.CONSUME9(Identifier, { LABEL: "joinName" });
    });
  });

  private flowFinalDeclaration = this.RULE("flowFinalDeclaration", () => {
    this.CONSUME(FlowFinalKeyword);
    this.OPTION6(() => {
      this.CONSUME1(Identifier, { LABEL: "flowFinalName" });
    });
  });

  private initialDeclaration = this.RULE("initialDeclaration", () => {
    this.CONSUME(InitialKeyword);
    this.OPTION7(() => {
      this.CONSUME1(Identifier, { LABEL: "initialName" });
    });
  });

  private finalDeclaration = this.RULE("finalDeclaration", () => {
    this.CONSUME(FinalKeyword);
    this.OPTION8(() => {
      this.CONSUME1(Identifier, { LABEL: "finalName" });
    });
  });

  private flowDeclaration = this.RULE("flowDeclaration", () => {
    this.SUBRULE(this.flowEndpoint, { LABEL: "sourceEndpoint" });
    this.CONSUME(FlowArrow);
    this.SUBRULE1(this.flowEndpoint, { LABEL: "targetEndpoint" });
    this.OPTION9(() => {
      this.CONSUME1(Colon);
      this.CONSUME2(LBracket);
      this.CONSUME3(Identifier, { LABEL: "guardName" });
      this.CONSUME4(RBracket);
    });
  });

  private flowEndpoint = this.RULE("flowEndpoint", () => {
    this.OR2([
      { ALT: () => this.CONSUME(InitialKeyword, { LABEL: "endpoint" }) },
      { ALT: () => this.CONSUME(FinalKeyword, { LABEL: "endpoint" }) },
      { ALT: () => this.CONSUME(FlowFinalKeyword, { LABEL: "endpoint" }) },
      { ALT: () => this.CONSUME(Identifier, { LABEL: "endpoint" }) },
    ]);
  });

  private isFlowStart(): boolean {
    const first = this.LA(1).tokenType;
    const second = this.LA(2).tokenType;
    return (
      (first === Identifier ||
        first === InitialKeyword ||
        first === FinalKeyword ||
        first === FlowFinalKeyword) &&
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
  nodeKind: AstActivityNodeKind,
  nameToken: IToken | undefined,
  fallbackName: string,
  node: CstNode,
): AstActivityNode | null {
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

class ActivityDslVisitor {
  visit(cst: CstNode): ActivityDiagramAst {
    const nameToken = cst.children.diagramName?.[0] as IToken | undefined;
    const partitions: AstActivityPartition[] = [];
    const interruptibles: AstActivityInterruptible[] = [];
    const nodes: AstActivityNode[] = [];
    const flows: AstActivityFlow[] = [];

    for (const node of cst.children.partitionDeclaration ?? []) {
      const partition = this.visitPartition(node as CstNode);
      if (partition !== null) {
        partitions.push(partition);
      }
    }

    for (const node of cst.children.interruptibleDeclaration ?? []) {
      const region = this.visitInterruptible(node as CstNode);
      if (region !== null) {
        interruptibles.push(region);
      }
    }

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
      kind: "activity",
      name: nameToken?.image,
      partitions,
      interruptibles,
      nodes,
      flows,
      span,
    };
  }

  private collectNodes(parent: CstNode, nodes: AstActivityNode[]): void {
    for (const node of parent.children.actionDeclaration ?? []) {
      const action = namedNode(
        "action",
        (node as CstNode).children.actionName?.[0] as IToken | undefined,
        "action",
        node as CstNode,
      );
      if (action !== null) {
        nodes.push(action);
      }
    }
    for (const node of parent.children.objectDeclaration ?? []) {
      const objectNode = namedNode(
        "objectNode",
        (node as CstNode).children.objectName?.[0] as IToken | undefined,
        "object",
        node as CstNode,
      );
      if (objectNode !== null) {
        nodes.push(objectNode);
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
    for (const node of parent.children.flowFinalDeclaration ?? []) {
      const flowFinal = namedNode(
        "flowFinalNode",
        (node as CstNode).children.flowFinalName?.[0] as IToken | undefined,
        "flowFinal",
        node as CstNode,
      );
      if (flowFinal !== null) {
        nodes.push(flowFinal);
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

  private visitBodyItems(parent: CstNode): AstActivityBodyItem[] {
    const items: AstActivityBodyItem[] = [];

    for (const node of parent.children.nestedPartitionDeclaration ?? []) {
      const nestedName = (node as CstNode).children.nestedPartitionName?.[0] as
        | IToken
        | undefined;
      const first = firstToken(node as CstNode);
      if (nestedName === undefined || first === undefined) {
        continue;
      }
      const nestedNodes: AstActivityNode[] = [];
      this.collectNodes(node as CstNode, nestedNodes);
      items.push({
        itemKind: "partition",
        partition: {
          name: nestedName.image,
          items: nestedNodes.map((activityNode) => ({
            itemKind: "node" as const,
            node: activityNode,
          })),
          span: tokenSpan(first, lastToken(node as CstNode)),
        },
      });
    }
    for (const node of parent.children.interruptibleDeclaration ?? []) {
      const region = this.visitInterruptible(node as CstNode);
      if (region !== null) {
        items.push({ itemKind: "interruptible", region });
      }
    }

    const nodes: AstActivityNode[] = [];
    this.collectNodes(parent, nodes);
    for (const node of nodes) {
      items.push({ itemKind: "node", node });
    }

    return items;
  }

  private visitPartition(node: CstNode): AstActivityPartition | null {
    const nameToken = node.children.partitionName?.[0] as IToken | undefined;
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

  private visitInterruptible(node: CstNode): AstActivityInterruptible | null {
    const nameToken = node.children.interruptibleName?.[0] as IToken | undefined;
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

  private visitFlow(node: CstNode): AstActivityFlow | null {
    const sourceNode = node.children.sourceEndpoint?.[0] as CstNode | undefined;
    const targetNode = node.children.targetEndpoint?.[0] as CstNode | undefined;
    const sourceToken = sourceNode?.children.endpoint?.[0] as IToken | undefined;
    const targetToken = targetNode?.children.endpoint?.[0] as IToken | undefined;
    if (sourceToken === undefined || targetToken === undefined) {
      return null;
    }

    const guardToken = node.children.guardName?.[0] as IToken | undefined;
    return {
      sourceName: sourceToken.image,
      targetName: targetToken.image,
      ...(guardToken !== undefined ? { guard: guardToken.image } : {}),
      span: tokenSpan(sourceToken, lastToken(node)),
    };
  }
}

const parser = new ActivityDslParser();
const visitor = new ActivityDslVisitor();

export function parseActivityDocument(cst: CstNode): ActivityDiagramAst {
  return visitor.visit(cst);
}

export function parseActivityCst(text: string): {
  cst: CstNode;
  lexerErrors: ILexingError[];
  parserErrors: IRecognitionException[];
  comments: ReturnType<typeof commentsFromLexerGroups>;
} {
  const lexResult = activityLexer.tokenize(text);
  parser.input = lexResult.tokens;
  const cst = parser.document();

  return {
    cst,
    lexerErrors: lexResult.errors,
    parserErrors: parser.errors,
    comments: commentsFromLexerGroups(lexResult.groups),
  };
}
