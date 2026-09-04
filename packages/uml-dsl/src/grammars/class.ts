import { CstParser, type CstNode, type ILexingError, type IRecognitionException, type IToken } from "chevrotain";
import type { RelationshipType, Visibility } from "@graphiq/uml-model";
import type {
  AstAttribute,
  AstClassifier,
  AstOperation,
  AstOperationParameter,
  AstRelationship,
  ClassDiagramAst,
  DslSpan,
} from "../ast.js";
import {
  AbstractKeyword,
  AggregationArrow,
  allTokens,
  AssociationArrow,
  ClassKeyword,
  Colon,
  Comma,
  CompositionArrow,
  DependencyArrow,
  DiagramKeyword,
  EnumKeyword,
  Equals,
  GeneralizationArrow,
  Identifier,
  InterfaceKeyword,
  LBracket,
  LCurly,
  LParen,
  NavigableArrow,
  PackageVisibility,
  PrivateVisibility,
  ProtectedVisibility,
  PublicVisibility,
  QuotedMultiplicity,
  RealizationArrow,
  RBracket,
  RCurly,
  RParen,
  UnquotedMultiplicity,
  classLexer,
} from "../tokens.js";

export class ClassDslParser extends CstParser {
  constructor() {
    super(allTokens, { recoveryEnabled: true });
    this.performSelfAnalysis();
  }

  public document = this.RULE("document", () => {
    this.CONSUME(DiagramKeyword);
    this.CONSUME(ClassKeyword, { LABEL: "diagramKind" });
    this.OPTION1(() => {
      this.CONSUME1(Identifier, { LABEL: "diagramName" });
    });
    this.MANY(() => {
      this.OR([
        { ALT: () => this.SUBRULE(this.classifierDeclaration) },
        { ALT: () => this.SUBRULE(this.relationshipDeclaration) },
      ]);
    });
  });

  private classifierDeclaration = this.RULE("classifierDeclaration", () => {
    this.OR([
      { ALT: () => this.SUBRULE(this.abstractClassDeclaration) },
      { ALT: () => this.SUBRULE(this.classDeclaration) },
      { ALT: () => this.SUBRULE(this.interfaceDeclaration) },
      { ALT: () => this.SUBRULE(this.enumDeclaration) },
    ]);
  });

  private abstractClassDeclaration = this.RULE("abstractClassDeclaration", () => {
    this.CONSUME(AbstractKeyword);
    this.CONSUME(ClassKeyword);
    this.CONSUME(Identifier, { LABEL: "className" });
    this.OPTION(() => {
      this.SUBRULE(this.classBody);
    });
  });

  private classDeclaration = this.RULE("classDeclaration", () => {
    this.CONSUME(ClassKeyword);
    this.CONSUME(Identifier, { LABEL: "className" });
    this.OPTION(() => {
      this.SUBRULE(this.classBody);
    });
  });

  private interfaceDeclaration = this.RULE("interfaceDeclaration", () => {
    this.CONSUME(InterfaceKeyword);
    this.CONSUME(Identifier, { LABEL: "interfaceName" });
    this.OPTION(() => {
      this.SUBRULE(this.classBody);
    });
  });

  private enumDeclaration = this.RULE("enumDeclaration", () => {
    this.CONSUME(EnumKeyword);
    this.CONSUME(Identifier, { LABEL: "enumName" });
    this.SUBRULE(this.enumBody);
  });

  private classBody = this.RULE("classBody", () => {
    this.CONSUME(LCurly);
    this.MANY(() => {
      this.SUBRULE(this.member);
    });
    this.CONSUME(RCurly);
  });

  private enumBody = this.RULE("enumBody", () => {
    this.CONSUME(LCurly);
    this.MANY(() => {
      this.CONSUME(Identifier, { LABEL: "literal" });
    });
    this.CONSUME(RCurly);
  });

  private member = this.RULE("member", () => {
    this.OR([
      { ALT: () => this.SUBRULE(this.operation) },
      { ALT: () => this.SUBRULE(this.attribute) },
    ]);
  });

  private visibility = this.RULE("visibility", () => {
    this.OR([
      { ALT: () => this.CONSUME(PublicVisibility) },
      { ALT: () => this.CONSUME(PrivateVisibility) },
      { ALT: () => this.CONSUME(ProtectedVisibility) },
      { ALT: () => this.CONSUME(PackageVisibility) },
    ]);
  });

  private attribute = this.RULE("attribute", () => {
    this.OPTION(() => {
      this.SUBRULE(this.visibility);
    });
    this.CONSUME(Identifier, { LABEL: "attributeName" });
    this.CONSUME(Colon);
    this.CONSUME1(Identifier, { LABEL: "typeName" });
    this.OPTION1(() => {
      this.SUBRULE(this.multiplicity);
    });
    this.OPTION2(() => {
      this.CONSUME(Equals);
      this.CONSUME2(Identifier, { LABEL: "defaultValue" });
    });
  });

  private operation = this.RULE("operation", () => {
    this.OPTION(() => {
      this.SUBRULE(this.visibility);
    });
    this.CONSUME(Identifier, { LABEL: "operationName" });
    this.CONSUME(LParen);
    this.OPTION1(() => {
      this.SUBRULE(this.operationParameters);
    });
    this.CONSUME(RParen);
    this.OPTION2(() => {
      this.CONSUME(Colon);
      this.CONSUME1(Identifier, { LABEL: "returnType" });
    });
  });

  private operationParameters = this.RULE("operationParameters", () => {
    this.SUBRULE(this.operationParameter);
    this.MANY(() => {
      this.CONSUME(Comma);
      this.SUBRULE1(this.operationParameter);
    });
  });

  private operationParameter = this.RULE("operationParameter", () => {
    this.CONSUME(Identifier, { LABEL: "parameterName" });
    this.CONSUME(Colon);
    this.CONSUME1(Identifier, { LABEL: "parameterType" });
  });

  private multiplicity = this.RULE("multiplicity", () => {
    this.CONSUME(LBracket);
    this.OR([
      { ALT: () => this.CONSUME(QuotedMultiplicity) },
      { ALT: () => this.CONSUME(UnquotedMultiplicity) },
    ]);
    this.CONSUME(RBracket);
  });

  private relationshipDeclaration = this.RULE("relationshipDeclaration", () => {
    this.CONSUME(Identifier, { LABEL: "sourceName" });
    this.OPTION(() => {
      this.SUBRULE(this.relationshipMultiplicity, { LABEL: "sourceMultiplicity" });
    });
    this.SUBRULE(this.relationshipArrow);
    this.OPTION1(() => {
      this.SUBRULE1(this.relationshipMultiplicity, { LABEL: "targetMultiplicity" });
    });
    this.CONSUME1(Identifier, { LABEL: "targetName" });
    this.OPTION2(() => {
      this.CONSUME(Colon);
      this.CONSUME2(Identifier, { LABEL: "relationshipName" });
    });
  });

  private relationshipMultiplicity = this.RULE("relationshipMultiplicity", () => {
    this.OR([
      { ALT: () => this.CONSUME(QuotedMultiplicity) },
      { ALT: () => this.CONSUME(UnquotedMultiplicity) },
    ]);
  });

  private relationshipArrow = this.RULE("relationshipArrow", () => {
    this.OR([
      { ALT: () => this.CONSUME(GeneralizationArrow) },
      { ALT: () => this.CONSUME(RealizationArrow) },
      { ALT: () => this.CONSUME(NavigableArrow) },
      { ALT: () => this.CONSUME(CompositionArrow) },
      { ALT: () => this.CONSUME(AggregationArrow) },
      { ALT: () => this.CONSUME(DependencyArrow) },
      { ALT: () => this.CONSUME(AssociationArrow) },
    ]);
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

function visibilityFromNode(node: CstNode | undefined): Visibility {
  if (!node) {
    return "public";
  }
  if (node.children.PublicVisibility) {
    return "public";
  }
  if (node.children.PrivateVisibility) {
    return "private";
  }
  if (node.children.ProtectedVisibility) {
    return "protected";
  }
  if (node.children.PackageVisibility) {
    return "package";
  }
  return "public";
}

function multiplicityValue(token: IToken): string {
  if (token.tokenType === QuotedMultiplicity) {
    return token.image.slice(1, -1);
  }
  return token.image;
}

function relationshipTypeFromArrow(node: CstNode): RelationshipType {
  if (node.children.GeneralizationArrow) {
    return "generalization";
  }
  if (node.children.RealizationArrow) {
    return "realization";
  }
  if (node.children.NavigableArrow) {
    return "navigableAssociation";
  }
  if (node.children.CompositionArrow) {
    return "composition";
  }
  if (node.children.AggregationArrow) {
    return "aggregation";
  }
  if (node.children.DependencyArrow) {
    return "dependency";
  }
  return "association";
}

export class ClassDslVisitor {
  visit(cst: CstNode): ClassDiagramAst {
    const diagramNameToken = cst.children.diagramName?.[0] as IToken | undefined;
    const startToken = cst.children.DiagramKeyword?.[0] as IToken | undefined;
    const endToken = lastToken(cst);

    const classifiers: AstClassifier[] = [];
    const relationships: AstRelationship[] = [];

    const classifierNodes = cst.children.classifierDeclaration ?? [];
    for (const node of classifierNodes) {
      classifiers.push(this.visitClassifier(node as CstNode));
    }

    const relationshipNodes = cst.children.relationshipDeclaration ?? [];
    for (const node of relationshipNodes) {
      relationships.push(this.visitRelationship(node as CstNode));
    }

    return {
      kind: "class",
      name: diagramNameToken?.image,
      classifiers,
      relationships,
      span: tokenSpan(
        startToken ?? { startOffset: 0, endOffset: 0 } as IToken,
        endToken,
      ),
    };
  }

  private visitClassifier(node: CstNode): AstClassifier {
    if (node.children.abstractClassDeclaration) {
      return this.visitAbstractClass(node.children.abstractClassDeclaration[0] as CstNode);
    }
    if (node.children.classDeclaration) {
      return this.visitClass(node.children.classDeclaration[0] as CstNode);
    }
    if (node.children.interfaceDeclaration) {
      return this.visitInterface(node.children.interfaceDeclaration[0] as CstNode);
    }
    return this.visitEnum(node.children.enumDeclaration?.[0] as CstNode);
  }

  private visitAbstractClass(node: CstNode): AstClassifier {
    const nameToken = node.children.className?.[0] as IToken;
    const body = node.children.classBody?.[0] as CstNode | undefined;
    const members = body ? this.visitMembers(body) : { attributes: [], operations: [] };

    return {
      classifierKind: "class",
      name: nameToken.image,
      isAbstract: true,
      attributes: members.attributes,
      operations: members.operations,
      span: tokenSpan(
        node.children.AbstractKeyword?.[0] as IToken,
        lastToken(node),
      ),
    };
  }

  private visitClass(node: CstNode): AstClassifier {
    const nameToken = node.children.className?.[0] as IToken;
    const body = node.children.classBody?.[0] as CstNode | undefined;
    const members = body ? this.visitMembers(body) : { attributes: [], operations: [] };

    return {
      classifierKind: "class",
      name: nameToken.image,
      isAbstract: false,
      attributes: members.attributes,
      operations: members.operations,
      span: tokenSpan(
        node.children.ClassKeyword?.[0] as IToken,
        lastToken(node),
      ),
    };
  }

  private visitInterface(node: CstNode): AstClassifier {
    const nameToken = node.children.interfaceName?.[0] as IToken;
    const body = node.children.classBody?.[0] as CstNode | undefined;
    const members = body ? this.visitMembers(body) : { attributes: [], operations: [] };

    return {
      classifierKind: "interface",
      name: nameToken.image,
      attributes: members.attributes,
      operations: members.operations,
      span: tokenSpan(
        node.children.InterfaceKeyword?.[0] as IToken,
        lastToken(node),
      ),
    };
  }

  private visitEnum(node: CstNode): AstClassifier {
    const nameToken = node.children.enumName?.[0] as IToken;
    const body = node.children.enumBody?.[0] as CstNode | undefined;
    const literalTokens = (body?.children.literal ?? []) as IToken[];

    return {
      classifierKind: "enumeration",
      name: nameToken.image,
      literals: literalTokens.map((token) => token.image),
      span: tokenSpan(
        node.children.EnumKeyword?.[0] as IToken,
        lastToken(node),
      ),
    };
  }

  private visitMembers(body: CstNode): {
    attributes: AstAttribute[];
    operations: AstOperation[];
  } {
    const attributes: AstAttribute[] = [];
    const operations: AstOperation[] = [];
    const memberNodes = body.children.member ?? [];

    for (const memberNode of memberNodes) {
      const member = memberNode as CstNode;
      if (member.children.operation) {
        operations.push(this.visitOperation(member.children.operation[0] as CstNode));
      } else if (member.children.attribute) {
        attributes.push(this.visitAttribute(member.children.attribute[0] as CstNode));
      }
    }

    return { attributes, operations };
  }

  private visitAttribute(node: CstNode): AstAttribute {
    const visibilityNode = node.children.visibility?.[0] as CstNode | undefined;
    const nameToken = node.children.attributeName?.[0] as IToken;
    const typeToken = node.children.typeName?.[0] as IToken;
    const multiplicityNode = node.children.multiplicity?.[0] as CstNode | undefined;
    const defaultToken = node.children.defaultValue?.[0] as IToken | undefined;

    let multiplicity: string | undefined;
    if (multiplicityNode) {
      const multiplicityToken =
        (multiplicityNode.children.QuotedMultiplicity?.[0] as IToken | undefined) ??
        (multiplicityNode.children.UnquotedMultiplicity?.[0] as IToken | undefined);
      if (multiplicityToken) {
        multiplicity = multiplicityValue(multiplicityToken);
      }
    }

    return {
      visibility: visibilityFromNode(visibilityNode),
      name: nameToken.image,
      typeName: typeToken.image,
      multiplicity,
      defaultValue: defaultToken?.image,
      span: tokenSpan(firstToken(node) ?? nameToken, lastToken(node)),
    };
  }

  private visitOperation(node: CstNode): AstOperation {
    const visibilityNode = node.children.visibility?.[0] as CstNode | undefined;
    const nameToken = node.children.operationName?.[0] as IToken;
    const returnToken = node.children.returnType?.[0] as IToken | undefined;
    const parametersNode = node.children.operationParameters?.[0] as CstNode | undefined;

    const parameters: AstOperationParameter[] = [];
    if (parametersNode) {
      const parameterNodes = parametersNode.children.operationParameter ?? [];
      for (const parameterNode of parameterNodes) {
        const parameter = parameterNode as CstNode;
        const parameterName = parameter.children.parameterName?.[0] as IToken;
        const parameterType = parameter.children.parameterType?.[0] as IToken;
        parameters.push({
          name: parameterName.image,
          typeName: parameterType.image,
        });
      }
    }

    return {
      visibility: visibilityFromNode(visibilityNode),
      name: nameToken.image,
      parameters,
      returnType: returnToken?.image,
      span: tokenSpan(firstToken(node) ?? nameToken, lastToken(node)),
    };
  }

  private visitRelationship(node: CstNode): AstRelationship {
    const sourceToken = node.children.sourceName?.[0] as IToken;
    const targetToken = node.children.targetName?.[0] as IToken;
    const nameToken = node.children.relationshipName?.[0] as IToken | undefined;
    const arrowNode = node.children.relationshipArrow?.[0] as CstNode;

    const sourceMultiplicityNode = node.children.sourceMultiplicity?.[0] as CstNode | undefined;
    const targetMultiplicityNode = node.children.targetMultiplicity?.[0] as CstNode | undefined;

    return {
      sourceName: sourceToken.image,
      targetName: targetToken.image,
      relationshipType: relationshipTypeFromArrow(arrowNode),
      sourceMultiplicity: this.readRelationshipMultiplicity(sourceMultiplicityNode),
      targetMultiplicity: this.readRelationshipMultiplicity(targetMultiplicityNode),
      name: nameToken?.image,
      span: tokenSpan(sourceToken, lastToken(node)),
    };
  }

  private readRelationshipMultiplicity(node: CstNode | undefined): string | undefined {
    if (!node) {
      return undefined;
    }
    const token =
      (node.children.QuotedMultiplicity?.[0] as IToken | undefined) ??
      (node.children.UnquotedMultiplicity?.[0] as IToken | undefined);
    return token ? multiplicityValue(token) : undefined;
  }
}

const parser = new ClassDslParser();
const visitor = new ClassDslVisitor();

export function parseClassDocument(cst: CstNode): ClassDiagramAst {
  return visitor.visit(cst);
}

export function parseClassCst(text: string): {
  cst: CstNode;
  lexerErrors: ILexingError[];
  parserErrors: IRecognitionException[];
} {
  const lexResult = classLexer.tokenize(text);
  parser.input = lexResult.tokens;
  const cst = parser.document();

  return {
    cst,
    lexerErrors: lexResult.errors,
    parserErrors: parser.errors,
  };
}
