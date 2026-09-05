import { CstParser, type CstNode, type ILexingError, type IRecognitionException, type IToken } from "chevrotain";
import type {
  AstDeploymentBodyItem,
  AstDeploymentNode,
  AstDeploymentNodeKind,
  AstDeploymentRelationship,
  DeploymentDiagramAst,
  DslSpan,
} from "../ast.js";
import { commentsFromLexerGroups } from "../comments.js";
import {
  AngleStereotype,
  ArtifactKeyword,
  Colon,
  CommunicationArrow,
  DependencyArrow,
  DeploymentKeyword,
  DiagramKeyword,
  GeneralizationArrow,
  GuillemetStereotype,
  Identifier,
  LCurly,
  NodeKeyword,
  RCurly,
  StringLiteral,
  deploymentLexer,
  deploymentTokens,
} from "../tokens/deploymentTokens.js";

export class DeploymentDslParser extends CstParser {
  constructor() {
    super(deploymentTokens, { recoveryEnabled: true });
    this.performSelfAnalysis();
  }

  public document = this.RULE("document", () => {
    this.CONSUME(DiagramKeyword);
    this.CONSUME(DeploymentKeyword, { LABEL: "diagramKind" });
    this.OPTION1(() => {
      this.SUBRULE(this.name, { LABEL: "diagramName" });
    });
    this.MANY(() => {
      this.OR([
        { ALT: () => this.SUBRULE(this.nodeDeclaration) },
        { ALT: () => this.SUBRULE(this.relationshipDeclaration) },
      ]);
    });
  });

  private name = this.RULE("name", () => {
    this.OR([
      { ALT: () => this.CONSUME(StringLiteral) },
      { ALT: () => this.CONSUME(Identifier) },
    ]);
  });

  private nodeDeclaration = this.RULE("nodeDeclaration", () => {
    this.CONSUME(NodeKeyword);
    this.SUBRULE1(this.name, { LABEL: "nodeName" });
    this.OPTION2(() => {
      this.OR2([
        { ALT: () => this.CONSUME(GuillemetStereotype) },
        { ALT: () => this.CONSUME(AngleStereotype) },
      ]);
    });
    this.OPTION3(() => {
      this.CONSUME(LCurly);
      this.MANY1(() => {
        this.SUBRULE(this.artifactItem);
      });
      this.CONSUME(RCurly);
    });
  });

  private artifactItem = this.RULE("artifactItem", () => {
    this.CONSUME(ArtifactKeyword);
    this.SUBRULE2(this.name, { LABEL: "artifactName" });
  });

  private relationshipDeclaration = this.RULE("relationshipDeclaration", () => {
    this.OR([
      {
        GATE: () => this.LA(2).tokenType === GeneralizationArrow,
        ALT: () => this.SUBRULE(this.generalizationDeclaration),
      },
      {
        GATE: () => this.LA(2).tokenType === DependencyArrow,
        ALT: () => this.SUBRULE(this.deployDeclaration),
      },
      { ALT: () => this.SUBRULE(this.communicationDeclaration) },
    ]);
  });

  private communicationDeclaration = this.RULE("communicationDeclaration", () => {
    this.SUBRULE3(this.name, { LABEL: "sourceName" });
    this.CONSUME(CommunicationArrow);
    this.SUBRULE4(this.name, { LABEL: "targetName" });
    this.OPTION4(() => {
      this.CONSUME(Colon);
      this.SUBRULE5(this.name, { LABEL: "pathName" });
    });
  });

  private deployDeclaration = this.RULE("deployDeclaration", () => {
    this.SUBRULE6(this.name, { LABEL: "sourceName" });
    this.CONSUME(DependencyArrow);
    this.SUBRULE7(this.name, { LABEL: "targetName" });
  });

  private generalizationDeclaration = this.RULE("generalizationDeclaration", () => {
    this.SUBRULE8(this.name, { LABEL: "sourceName" });
    this.CONSUME(GeneralizationArrow);
    this.SUBRULE9(this.name, { LABEL: "targetName" });
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

function unquote(image: string): string {
  if (image.startsWith('"') && image.endsWith('"') && image.length >= 2) {
    return image.slice(1, -1);
  }
  return image;
}

function nameFromNode(node: CstNode | undefined): IToken | undefined {
  if (!node) {
    return undefined;
  }
  return (node.children.StringLiteral?.[0] ?? node.children.Identifier?.[0]) as IToken | undefined;
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

function nodeKindFromStereotype(image: string | undefined): AstDeploymentNodeKind {
  if (image === undefined) {
    return "node";
  }
  const normalized = stereotypeName(image).trim();
  if (normalized === "device") {
    return "device";
  }
  if (normalized === "executionEnvironment") {
    return "executionEnvironment";
  }
  return "node";
}

class DeploymentDslVisitor {
  visit(cst: CstNode): DeploymentDiagramAst {
    const nameNode = cst.children.diagramName?.[0] as CstNode | undefined;
    const nameToken = nameFromNode(nameNode);
    const nodes: AstDeploymentNode[] = [];
    const relationships: AstDeploymentRelationship[] = [];

    for (const node of cst.children.nodeDeclaration ?? []) {
      nodes.push(this.visitNode(node as CstNode));
    }

    for (const node of cst.children.relationshipDeclaration ?? []) {
      relationships.push(this.visitRelationship(node as CstNode));
    }

    const first = firstToken(cst);
    const last = lastToken(cst);
    const span = first !== undefined ? tokenSpan(first, last) : { start: 0, end: 0 };

    return {
      kind: "deployment",
      name: nameToken === undefined ? undefined : unquote(nameToken.image),
      nodes,
      relationships,
      span,
    };
  }

  private visitNode(node: CstNode): AstDeploymentNode {
    const nameToken = nameFromNode(node.children.nodeName?.[0] as CstNode);
    const stereotypeToken = (node.children.GuillemetStereotype?.[0] ??
      node.children.AngleStereotype?.[0]) as IToken | undefined;
    const items: AstDeploymentBodyItem[] = [];

    for (const itemNode of node.children.artifactItem ?? []) {
      items.push(this.visitArtifact(itemNode as CstNode));
    }

    return {
      name: unquote(nameToken?.image ?? ""),
      nodeKind: nodeKindFromStereotype(stereotypeToken?.image),
      items,
      span: tokenSpan(nameToken ?? firstToken(node)!, lastToken(node)),
    };
  }

  private visitArtifact(node: CstNode): AstDeploymentBodyItem {
    const nameToken = nameFromNode(node.children.artifactName?.[0] as CstNode);
    return {
      itemKind: "artifact",
      name: unquote(nameToken?.image ?? ""),
      span: tokenSpan(nameToken ?? firstToken(node)!, lastToken(node)),
    };
  }

  private visitRelationship(node: CstNode): AstDeploymentRelationship {
    if (node.children.communicationDeclaration) {
      const declaration = node.children.communicationDeclaration[0] as CstNode;
      const sourceToken = nameFromNode(declaration.children.sourceName?.[0] as CstNode);
      const targetToken = nameFromNode(declaration.children.targetName?.[0] as CstNode);
      const pathToken = nameFromNode(declaration.children.pathName?.[0] as CstNode);
      return {
        relationshipKind: "communicationPath",
        sourceName: unquote(sourceToken?.image ?? ""),
        targetName: unquote(targetToken?.image ?? ""),
        name: pathToken === undefined ? undefined : unquote(pathToken.image),
        span: tokenSpan(sourceToken ?? firstToken(declaration)!, lastToken(declaration)),
      };
    }

    if (node.children.deployDeclaration) {
      const declaration = node.children.deployDeclaration[0] as CstNode;
      const sourceToken = nameFromNode(declaration.children.sourceName?.[0] as CstNode);
      const targetToken = nameFromNode(declaration.children.targetName?.[0] as CstNode);
      return {
        relationshipKind: "deployment",
        sourceName: unquote(sourceToken?.image ?? ""),
        targetName: unquote(targetToken?.image ?? ""),
        span: tokenSpan(sourceToken ?? firstToken(declaration)!, lastToken(declaration)),
      };
    }

    const declaration = node.children.generalizationDeclaration?.[0] as CstNode;
    const sourceToken = nameFromNode(declaration.children.sourceName?.[0] as CstNode);
    const targetToken = nameFromNode(declaration.children.targetName?.[0] as CstNode);
    return {
      relationshipKind: "generalization",
      sourceName: unquote(sourceToken?.image ?? ""),
      targetName: unquote(targetToken?.image ?? ""),
      span: tokenSpan(sourceToken ?? firstToken(declaration)!, lastToken(declaration)),
    };
  }
}

const parser = new DeploymentDslParser();
const visitor = new DeploymentDslVisitor();

export function parseDeploymentDocument(cst: CstNode): DeploymentDiagramAst {
  return visitor.visit(cst);
}

export function parseDeploymentCst(text: string): {
  cst: CstNode;
  lexerErrors: ILexingError[];
  parserErrors: IRecognitionException[];
  comments: ReturnType<typeof commentsFromLexerGroups>;
} {
  const lexResult = deploymentLexer.tokenize(text);
  parser.input = lexResult.tokens;
  const cst = parser.document();

  return {
    cst,
    lexerErrors: lexResult.errors,
    parserErrors: parser.errors,
    comments: commentsFromLexerGroups(lexResult.groups),
  };
}
