import { CstParser, type CstNode, type ILexingError, type IRecognitionException, type IToken } from "chevrotain";
import type {
  AstCompositeStructureBodyItem,
  AstCompositeStructureConnector,
  AstCompositeStructureFrame,
  CompositeStructureDiagramAst,
  DslSpan,
} from "../ast.js";
import {
  ClassKeyword,
  Colon,
  ComponentKeyword,
  CompositeStructureDiagramKeyword,
  ConnectorKeyword,
  DiagramKeyword,
  Dot,
  Identifier,
  LCurly,
  Multiplicity,
  PartKeyword,
  PortKeyword,
  RCurly,
  ToKeyword,
  compositeStructureLexer,
  compositeStructureTokens,
} from "../tokens/compositeStructureTokens.js";

export class CompositeStructureDslParser extends CstParser {
  constructor() {
    super(compositeStructureTokens, { recoveryEnabled: true });
    this.performSelfAnalysis();
  }

  public document = this.RULE("document", () => {
    this.CONSUME(DiagramKeyword);
    this.CONSUME(CompositeStructureDiagramKeyword, { LABEL: "diagramKind" });
    this.OPTION1(() => {
      this.CONSUME1(Identifier, { LABEL: "diagramName" });
    });
    this.MANY(() => {
      this.OR([
        { ALT: () => this.SUBRULE(this.frameDeclaration) },
        { ALT: () => this.SUBRULE(this.connectorDeclaration) },
      ]);
    });
  });

  private frameDeclaration = this.RULE("frameDeclaration", () => {
    this.OR([
      { ALT: () => this.SUBRULE(this.classFrameDeclaration) },
      { ALT: () => this.SUBRULE(this.componentFrameDeclaration) },
    ]);
  });

  private classFrameDeclaration = this.RULE("classFrameDeclaration", () => {
    this.CONSUME(ClassKeyword);
    this.CONSUME(Identifier, { LABEL: "frameName" });
    this.CONSUME(LCurly);
    this.MANY1(() => {
      this.SUBRULE(this.frameBodyItem);
    });
    this.CONSUME(RCurly);
  });

  private componentFrameDeclaration = this.RULE("componentFrameDeclaration", () => {
    this.CONSUME(ComponentKeyword);
    this.CONSUME1(Identifier, { LABEL: "componentFrameName" });
    this.CONSUME1(LCurly);
    this.MANY2(() => {
      this.SUBRULE1(this.frameBodyItem);
    });
    this.CONSUME1(RCurly);
  });

  private frameBodyItem = this.RULE("frameBodyItem", () => {
    this.OR([
      { ALT: () => this.SUBRULE(this.partDeclaration) },
      { ALT: () => this.SUBRULE(this.portDeclaration) },
    ]);
  });

  private partDeclaration = this.RULE("partDeclaration", () => {
    this.CONSUME(PartKeyword);
    this.CONSUME2(Identifier, { LABEL: "partName" });
    this.CONSUME(Colon);
    this.CONSUME3(Identifier, { LABEL: "partTypeName" });
    this.OPTION2(() => {
      this.CONSUME(Multiplicity);
    });
  });

  private portDeclaration = this.RULE("portDeclaration", () => {
    this.CONSUME(PortKeyword);
    this.CONSUME4(Identifier, { LABEL: "portName" });
    this.OPTION3(() => {
      this.CONSUME1(Colon);
      this.CONSUME5(Identifier, { LABEL: "portTypeName" });
    });
  });

  private connectorDeclaration = this.RULE("connectorDeclaration", () => {
    this.CONSUME(ConnectorKeyword);
    this.CONSUME6(Identifier, { LABEL: "connectorName" });
    this.CONSUME2(Colon);
    this.SUBRULE(this.connectorEnd, { LABEL: "sourceEnd" });
    this.CONSUME(ToKeyword);
    this.SUBRULE1(this.connectorEnd, { LABEL: "targetEnd" });
  });

  private connectorEnd = this.RULE("connectorEnd", () => {
    this.CONSUME7(Identifier, { LABEL: "endRootName" });
    this.OPTION4(() => {
      this.CONSUME(Dot);
      this.CONSUME8(Identifier, { LABEL: "endPortName" });
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

function multiplicityValue(token: IToken | undefined): string | undefined {
  if (token === undefined) {
    return undefined;
  }
  return token.image.slice(1, -1);
}

class CompositeStructureDslVisitor {
  visit(cst: CstNode): CompositeStructureDiagramAst {
    const nameToken = cst.children.diagramName?.[0] as IToken | undefined;
    const frames: AstCompositeStructureFrame[] = [];
    const connectors: AstCompositeStructureConnector[] = [];

    for (const node of cst.children.frameDeclaration ?? []) {
      frames.push(this.visitFrame(node as CstNode));
    }

    for (const node of cst.children.connectorDeclaration ?? []) {
      connectors.push(this.visitConnector(node as CstNode));
    }

    const first = firstToken(cst);
    const last = lastToken(cst);
    const span = first !== undefined ? tokenSpan(first, last) : { start: 0, end: 0 };

    return {
      kind: "compositeStructure",
      name: nameToken?.image,
      frames,
      connectors,
      span,
    };
  }

  private visitFrame(node: CstNode): AstCompositeStructureFrame {
    if (node.children.classFrameDeclaration) {
      const declaration = node.children.classFrameDeclaration[0] as CstNode;
      const nameToken = declaration.children.frameName?.[0] as IToken;
      return {
        frameKind: "class",
        name: nameToken.image,
        items: this.visitBodyItems(declaration),
        span: tokenSpan(nameToken, lastToken(declaration)),
      };
    }

    const declaration = node.children.componentFrameDeclaration?.[0] as CstNode;
    const nameToken = declaration.children.componentFrameName?.[0] as IToken;
    return {
      frameKind: "component",
      name: nameToken.image,
      items: this.visitBodyItems(declaration),
      span: tokenSpan(nameToken, lastToken(declaration)),
    };
  }

  private visitBodyItems(frameNode: CstNode): AstCompositeStructureBodyItem[] {
    const items: AstCompositeStructureBodyItem[] = [];
    for (const bodyNode of frameNode.children.frameBodyItem ?? []) {
      const node = bodyNode as CstNode;
      if (node.children.partDeclaration) {
        const partNode = node.children.partDeclaration[0] as CstNode;
        const nameToken = partNode.children.partName?.[0] as IToken | undefined;
        const typeToken = partNode.children.partTypeName?.[0] as IToken | undefined;
        if (nameToken === undefined || typeToken === undefined) {
          continue;
        }
        const multToken = partNode.children.Multiplicity?.[0] as IToken | undefined;
        items.push({
          itemKind: "part",
          name: nameToken.image,
          typeName: typeToken.image,
          multiplicity: multiplicityValue(multToken),
          span: tokenSpan(nameToken, lastToken(partNode)),
        });
        continue;
      }

      const portNode = node.children.portDeclaration?.[0] as CstNode | undefined;
      if (portNode === undefined) {
        continue;
      }
      const nameToken = portNode.children.portName?.[0] as IToken | undefined;
      if (nameToken === undefined) {
        continue;
      }
      const typeToken = portNode.children.portTypeName?.[0] as IToken | undefined;
      items.push({
        itemKind: "port",
        name: nameToken.image,
        typeName: typeToken?.image,
        span: tokenSpan(nameToken, lastToken(portNode)),
      });
    }
    return items;
  }

  private visitConnector(node: CstNode): AstCompositeStructureConnector {
    const nameToken = node.children.connectorName?.[0] as IToken;
    const sourceEnd = this.visitConnectorEnd(node.children.sourceEnd?.[0] as CstNode);
    const targetEnd = this.visitConnectorEnd(node.children.targetEnd?.[0] as CstNode);

    return {
      name: nameToken.image,
      sourceEnd,
      targetEnd,
      span: tokenSpan(nameToken, lastToken(node)),
    };
  }

  private visitConnectorEnd(node: CstNode): { rootName: string; portName?: string } {
    const rootToken = node.children.endRootName?.[0] as IToken;
    const portToken = node.children.endPortName?.[0] as IToken | undefined;
    return {
      rootName: rootToken.image,
      portName: portToken?.image,
    };
  }
}

const parser = new CompositeStructureDslParser();
const visitor = new CompositeStructureDslVisitor();

export function parseCompositeStructureDocument(cst: CstNode): CompositeStructureDiagramAst {
  return visitor.visit(cst);
}

export function parseCompositeStructureCst(text: string): {
  cst: CstNode;
  lexerErrors: ILexingError[];
  parserErrors: IRecognitionException[];
} {
  const lexResult = compositeStructureLexer.tokenize(text);
  parser.input = lexResult.tokens;
  const cst = parser.document();

  return {
    cst,
    lexerErrors: lexResult.errors,
    parserErrors: parser.errors,
  };
}
