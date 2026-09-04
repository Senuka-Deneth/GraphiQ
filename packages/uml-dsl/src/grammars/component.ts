import { CstParser, type CstNode, type ILexingError, type IRecognitionException, type IToken } from "chevrotain";
import type {
  AstComponentBodyItem,
  AstComponentDeclaration,
  AstComponentRelationship,
  ComponentDiagramAst,
  DslSpan,
} from "../ast.js";
import {
  ArtifactKeyword,
  AssemblyArrow,
  ComponentKeyword,
  DependencyArrow,
  DiagramKeyword,
  Identifier,
  LCurly,
  PortKeyword,
  ProvidedKeyword,
  ProvidesKeyword,
  RCurly,
  RequiredKeyword,
  RequiresKeyword,
  componentLexer,
  componentTokens,
} from "../tokens/componentTokens.js";

export class ComponentDslParser extends CstParser {
  constructor() {
    super(componentTokens, { recoveryEnabled: true });
    this.performSelfAnalysis();
  }

  public document = this.RULE("document", () => {
    this.CONSUME(DiagramKeyword);
    this.CONSUME(ComponentKeyword, { LABEL: "diagramKind" });
    this.OPTION1(() => {
      this.CONSUME1(Identifier, { LABEL: "diagramName" });
    });
    this.MANY(() => {
      this.OR([
        { ALT: () => this.SUBRULE(this.componentDeclaration) },
        { ALT: () => this.SUBRULE(this.relationshipDeclaration) },
      ]);
    });
  });

  private componentDeclaration = this.RULE("componentDeclaration", () => {
    this.CONSUME1(ComponentKeyword);
    this.CONSUME2(Identifier, { LABEL: "componentName" });
    this.OPTION2(() => {
      this.CONSUME(LCurly);
      this.MANY1(() => {
        this.SUBRULE(this.componentBodyItem);
      });
      this.CONSUME(RCurly);
    });
  });

  private componentBodyItem = this.RULE("componentBodyItem", () => {
    this.OR([
      { ALT: () => this.SUBRULE(this.providesItem) },
      { ALT: () => this.SUBRULE(this.requiresItem) },
      { ALT: () => this.SUBRULE(this.portItem) },
      { ALT: () => this.SUBRULE(this.artifactItem) },
    ]);
  });

  private providesItem = this.RULE("providesItem", () => {
    this.CONSUME(ProvidesKeyword);
    this.CONSUME(Identifier, { LABEL: "interfaceName" });
  });

  private requiresItem = this.RULE("requiresItem", () => {
    this.CONSUME(RequiresKeyword);
    this.CONSUME(Identifier, { LABEL: "interfaceName" });
  });

  private portItem = this.RULE("portItem", () => {
    this.CONSUME(PortKeyword);
    this.CONSUME(Identifier, { LABEL: "portName" });
  });

  private artifactItem = this.RULE("artifactItem", () => {
    this.CONSUME(ArtifactKeyword);
    this.CONSUME(Identifier, { LABEL: "artifactName" });
  });

  private relationshipDeclaration = this.RULE("relationshipDeclaration", () => {
    this.OR([
      {
        GATE: () => this.LA(2).tokenType === RequiredKeyword,
        ALT: () => this.SUBRULE(this.assemblyDeclaration),
      },
      {
        GATE: () => this.LA(2).tokenType === DependencyArrow,
        ALT: () => this.SUBRULE(this.dependencyDeclaration),
      },
      { ALT: () => this.SUBRULE(this.delegationDeclaration) },
    ]);
  });

  private assemblyDeclaration = this.RULE("assemblyDeclaration", () => {
    this.CONSUME(Identifier, { LABEL: "sourceComponentName" });
    this.CONSUME(RequiredKeyword);
    this.CONSUME1(Identifier, { LABEL: "sourceInterfaceName" });
    this.CONSUME(AssemblyArrow);
    this.CONSUME(ProvidedKeyword);
    this.CONSUME2(Identifier, { LABEL: "targetInterfaceName" });
    this.CONSUME3(Identifier, { LABEL: "targetComponentName" });
  });

  private dependencyDeclaration = this.RULE("dependencyDeclaration", () => {
    this.CONSUME(Identifier, { LABEL: "sourceName" });
    this.CONSUME(DependencyArrow);
    this.CONSUME1(Identifier, { LABEL: "targetName" });
  });

  private delegationDeclaration = this.RULE("delegationDeclaration", () => {
    this.CONSUME(Identifier, { LABEL: "sourceName" });
    this.CONSUME(AssemblyArrow);
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

class ComponentDslVisitor {
  visit(cst: CstNode): ComponentDiagramAst {
    const nameToken = cst.children.diagramName?.[0] as IToken | undefined;
    const components: AstComponentDeclaration[] = [];
    const relationships: AstComponentRelationship[] = [];

    for (const node of cst.children.componentDeclaration ?? []) {
      components.push(this.visitComponent(node as CstNode));
    }

    for (const node of cst.children.relationshipDeclaration ?? []) {
      relationships.push(this.visitRelationship(node as CstNode));
    }

    const first = firstToken(cst);
    const last = lastToken(cst);
    const span = first !== undefined ? tokenSpan(first, last) : { start: 0, end: 0 };

    return {
      kind: "component",
      name: nameToken?.image,
      components,
      relationships,
      span,
    };
  }

  private visitComponent(node: CstNode): AstComponentDeclaration {
    const nameToken = node.children.componentName?.[0] as IToken;
    const items: AstComponentBodyItem[] = [];

    for (const bodyNode of node.children.componentBodyItem ?? []) {
      items.push(this.visitBodyItem(bodyNode as CstNode));
    }

    return {
      name: nameToken.image,
      items,
      span: tokenSpan(nameToken, lastToken(node)),
    };
  }

  private visitBodyItem(node: CstNode): AstComponentBodyItem {
    if (node.children.providesItem) {
      const item = node.children.providesItem[0] as CstNode;
      const nameToken = item.children.interfaceName?.[0] as IToken;
      return {
        itemKind: "provides",
        name: nameToken.image,
        span: tokenSpan(nameToken, lastToken(item)),
      };
    }

    if (node.children.requiresItem) {
      const item = node.children.requiresItem[0] as CstNode;
      const nameToken = item.children.interfaceName?.[0] as IToken;
      return {
        itemKind: "requires",
        name: nameToken.image,
        span: tokenSpan(nameToken, lastToken(item)),
      };
    }

    if (node.children.portItem) {
      const item = node.children.portItem[0] as CstNode;
      const nameToken = item.children.portName?.[0] as IToken;
      return {
        itemKind: "port",
        name: nameToken.image,
        span: tokenSpan(nameToken, lastToken(item)),
      };
    }

    const item = node.children.artifactItem?.[0] as CstNode;
    const nameToken = item.children.artifactName?.[0] as IToken;
    return {
      itemKind: "artifact",
      name: nameToken.image,
      span: tokenSpan(nameToken, lastToken(item)),
    };
  }

  private visitRelationship(node: CstNode): AstComponentRelationship {
    if (node.children.assemblyDeclaration) {
      const declaration = node.children.assemblyDeclaration[0] as CstNode;
      const sourceComponent = declaration.children.sourceComponentName?.[0] as IToken;
      const sourceInterface = declaration.children.sourceInterfaceName?.[0] as IToken;
      const targetInterface = declaration.children.targetInterfaceName?.[0] as IToken;
      const targetComponent = declaration.children.targetComponentName?.[0] as IToken;
      return {
        relationshipKind: "assembly",
        sourceComponentName: sourceComponent.image,
        sourceInterfaceName: sourceInterface.image,
        targetInterfaceName: targetInterface.image,
        targetComponentName: targetComponent.image,
        span: tokenSpan(sourceComponent, lastToken(declaration)),
      };
    }

    if (node.children.dependencyDeclaration) {
      const declaration = node.children.dependencyDeclaration[0] as CstNode;
      const sourceToken = declaration.children.sourceName?.[0] as IToken;
      const targetToken = declaration.children.targetName?.[0] as IToken;
      return {
        relationshipKind: "dependency",
        sourceName: sourceToken.image,
        targetName: targetToken.image,
        span: tokenSpan(sourceToken, lastToken(declaration)),
      };
    }

    const declaration = node.children.delegationDeclaration?.[0] as CstNode;
    const sourceToken = declaration.children.sourceName?.[0] as IToken;
    const targetToken = declaration.children.targetName?.[0] as IToken;
    return {
      relationshipKind: "delegation",
      sourceName: sourceToken.image,
      targetName: targetToken.image,
      span: tokenSpan(sourceToken, lastToken(declaration)),
    };
  }
}

const parser = new ComponentDslParser();
const visitor = new ComponentDslVisitor();

export function parseComponentDocument(cst: CstNode): ComponentDiagramAst {
  return visitor.visit(cst);
}

export function parseComponentCst(text: string): {
  cst: CstNode;
  lexerErrors: ILexingError[];
  parserErrors: IRecognitionException[];
} {
  const lexResult = componentLexer.tokenize(text);
  parser.input = lexResult.tokens;
  const cst = parser.document();

  return {
    cst,
    lexerErrors: lexResult.errors,
    parserErrors: parser.errors,
  };
}
