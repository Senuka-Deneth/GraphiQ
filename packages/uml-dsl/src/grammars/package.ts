import { CstParser, type CstNode, type ILexingError, type IRecognitionException, type IToken } from "chevrotain";
import type { RelationshipType } from "@graphiq/uml-model";
import type {
  AstClassifier,
  AstPackageBodyItem,
  AstPackageDeclaration,
  AstPackageRelationship,
  DslSpan,
  PackageDiagramAst,
} from "../ast.js";
import { commentsFromLexerGroups } from "../comments.js";
import {
  AbstractKeyword,
  AngleStereotype,
  ClassKeyword,
  Colon,
  DependencyArrow,
  DiagramKeyword,
  EnumKeyword,
  GuillemetStereotype,
  Identifier,
  InterfaceKeyword,
  LCurly,
  PackageKeyword,
  RCurly,
  packageLexer,
  packageTokens,
} from "../tokens/packageTokens.js";

export class PackageDslParser extends CstParser {
  constructor() {
    super(packageTokens, { recoveryEnabled: true });
    this.performSelfAnalysis();
  }

  public document = this.RULE("document", () => {
    this.CONSUME(DiagramKeyword);
    this.CONSUME(PackageKeyword, { LABEL: "diagramKind" });
    this.OPTION1(() => {
      this.CONSUME1(Identifier, { LABEL: "diagramName" });
    });
    this.MANY(() => {
      this.OR([
        { ALT: () => this.SUBRULE(this.packageDeclaration) },
        { ALT: () => this.SUBRULE(this.relationshipDeclaration) },
      ]);
    });
  });

  private packageDeclaration = this.RULE("packageDeclaration", () => {
    this.CONSUME2(PackageKeyword);
    this.CONSUME2(Identifier, { LABEL: "packageName" });
    this.CONSUME(LCurly);
    this.MANY1(() => {
      this.SUBRULE(this.packageBodyItem);
    });
    this.CONSUME(RCurly);
  });

  private packageBodyItem = this.RULE("packageBodyItem", () => {
    this.OR([
      { ALT: () => this.SUBRULE(this.nestedPackageDeclaration) },
      { ALT: () => this.SUBRULE(this.classifierDeclaration) },
    ]);
  });

  private nestedPackageDeclaration = this.RULE("nestedPackageDeclaration", () => {
    this.CONSUME3(PackageKeyword);
    this.CONSUME3(Identifier, { LABEL: "nestedPackageName" });
    this.CONSUME1(LCurly);
    this.MANY2(() => {
      this.SUBRULE1(this.packageBodyItem);
    });
    this.CONSUME1(RCurly);
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
    this.CONSUME4(Identifier, { LABEL: "className" });
  });

  private classDeclaration = this.RULE("classDeclaration", () => {
    this.CONSUME4(ClassKeyword);
    this.CONSUME5(Identifier, { LABEL: "className" });
  });

  private interfaceDeclaration = this.RULE("interfaceDeclaration", () => {
    this.CONSUME(InterfaceKeyword);
    this.CONSUME6(Identifier, { LABEL: "interfaceName" });
  });

  private enumDeclaration = this.RULE("enumDeclaration", () => {
    this.CONSUME(EnumKeyword);
    this.CONSUME7(Identifier, { LABEL: "enumName" });
  });

  private relationshipDeclaration = this.RULE("relationshipDeclaration", () => {
    this.CONSUME8(Identifier, { LABEL: "sourceName" });
    this.CONSUME(DependencyArrow);
    this.CONSUME9(Identifier, { LABEL: "targetName" });
    this.OPTION2(() => {
      this.CONSUME2(Colon);
      this.SUBRULE(this.relationshipLabel);
    });
  });

  private relationshipLabel = this.RULE("relationshipLabel", () => {
    this.OR([
      { ALT: () => this.CONSUME(GuillemetStereotype) },
      { ALT: () => this.CONSUME(AngleStereotype) },
      { ALT: () => this.CONSUME1(Identifier, { LABEL: "relationshipLabelName" }) },
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

function stereotypeName(image: string): string {
  if (image.startsWith("«") && image.endsWith("»")) {
    return image.slice(1, -1);
  }
  if (image.startsWith("<<") && image.endsWith(">>")) {
    return image.slice(2, -2);
  }
  return image;
}

function relationshipTypeFromLabel(label: string): Extract<
  RelationshipType,
  "packageImport" | "packageMerge" | "dependency"
> {
  const normalized = stereotypeName(label).trim().toLowerCase();
  if (normalized === "import") {
    return "packageImport";
  }
  if (normalized === "merge") {
    return "packageMerge";
  }
  return "dependency";
}

class PackageDslVisitor {
  visit(cst: CstNode): PackageDiagramAst {
    const nameToken = cst.children.diagramName?.[0] as IToken | undefined;
    const packages: AstPackageDeclaration[] = [];
    const relationships: AstPackageRelationship[] = [];

    for (const node of cst.children.packageDeclaration ?? []) {
      packages.push(this.visitPackage(node as CstNode));
    }

    for (const node of cst.children.relationshipDeclaration ?? []) {
      relationships.push(this.visitRelationship(node as CstNode));
    }

    const first = firstToken(cst);
    const last = lastToken(cst);
    const span =
      first !== undefined ? tokenSpan(first, last) : { start: 0, end: 0 };

    return {
      kind: "package",
      name: nameToken?.image,
      packages,
      relationships,
      span,
    };
  }

  private visitPackage(node: CstNode): AstPackageDeclaration {
    const nameToken = node.children.packageName?.[0] as IToken;
    const items: AstPackageBodyItem[] = [];

    for (const bodyNode of node.children.packageBodyItem ?? []) {
      items.push(this.visitPackageBodyItem(bodyNode as CstNode));
    }

    return {
      name: nameToken.image,
      items,
      span: tokenSpan(nameToken, lastToken(node)),
    };
  }

  private visitPackageBodyItem(node: CstNode): AstPackageBodyItem {
    if (node.children.nestedPackageDeclaration) {
      const nestedNode = node.children.nestedPackageDeclaration[0] as CstNode;
      const nameToken = nestedNode.children.nestedPackageName?.[0] as IToken;
      const items: AstPackageBodyItem[] = [];
      for (const bodyNode of nestedNode.children.packageBodyItem ?? []) {
        items.push(this.visitPackageBodyItem(bodyNode as CstNode));
      }
      return {
        itemKind: "nestedPackage",
        name: nameToken.image,
        items,
        span: tokenSpan(nameToken, lastToken(nestedNode)),
      };
    }

    const classifierNode = node.children.classifierDeclaration?.[0] as CstNode;
    return {
      itemKind: "classifier",
      classifier: this.visitClassifier(classifierNode),
      span: tokenSpan(firstToken(classifierNode)!, lastToken(classifierNode)),
    };
  }

  private visitClassifier(node: CstNode): AstClassifier {
    if (node.children.abstractClassDeclaration) {
      const declaration = node.children.abstractClassDeclaration[0] as CstNode;
      const nameToken = declaration.children.className?.[0] as IToken;
      return {
        classifierKind: "class",
        name: nameToken.image,
        nameSpan: tokenSpan(nameToken),
        isAbstract: true,
        attributes: [],
        operations: [],
        span: tokenSpan(nameToken, lastToken(declaration)),
      };
    }

    if (node.children.classDeclaration) {
      const declaration = node.children.classDeclaration[0] as CstNode;
      const nameToken = declaration.children.className?.[0] as IToken;
      return {
        classifierKind: "class",
        name: nameToken.image,
        nameSpan: tokenSpan(nameToken),
        isAbstract: false,
        attributes: [],
        operations: [],
        span: tokenSpan(nameToken, lastToken(declaration)),
      };
    }

    if (node.children.interfaceDeclaration) {
      const declaration = node.children.interfaceDeclaration[0] as CstNode;
      const nameToken = declaration.children.interfaceName?.[0] as IToken;
      return {
        classifierKind: "interface",
        name: nameToken.image,
        nameSpan: tokenSpan(nameToken),
        attributes: [],
        operations: [],
        span: tokenSpan(nameToken, lastToken(declaration)),
      };
    }

    const declaration = node.children.enumDeclaration?.[0] as CstNode;
    const nameToken = declaration.children.enumName?.[0] as IToken;
    return {
      classifierKind: "enumeration",
      name: nameToken.image,
      nameSpan: tokenSpan(nameToken),
      literals: [],
      span: tokenSpan(nameToken, lastToken(declaration)),
    };
  }

  private visitRelationship(node: CstNode): AstPackageRelationship {
    const sourceToken = node.children.sourceName?.[0] as IToken;
    const targetToken = node.children.targetName?.[0] as IToken;
    const labelNode = node.children.relationshipLabel?.[0] as CstNode | undefined;
    const labelToken = labelNode
      ? ((labelNode.children.GuillemetStereotype?.[0] ??
          labelNode.children.AngleStereotype?.[0] ??
          labelNode.children.relationshipLabelName?.[0]) as IToken | undefined)
      : undefined;

    const relationshipType =
      labelToken === undefined
        ? "dependency"
        : relationshipTypeFromLabel(labelToken.image);

    return {
      sourceName: sourceToken.image,
      targetName: targetToken.image,
      relationshipType,
      span: tokenSpan(sourceToken, lastToken(node)),
    };
  }
}

const parser = new PackageDslParser();
const visitor = new PackageDslVisitor();

export function parsePackageDocument(cst: CstNode): PackageDiagramAst {
  return visitor.visit(cst);
}

export function parsePackageCst(text: string): {
  cst: CstNode;
  lexerErrors: ILexingError[];
  parserErrors: IRecognitionException[];
  comments: ReturnType<typeof commentsFromLexerGroups>;
} {
  const lexResult = packageLexer.tokenize(text);
  parser.input = lexResult.tokens;
  const cst = parser.document();

  return {
    cst,
    lexerErrors: lexResult.errors,
    parserErrors: parser.errors,
    comments: commentsFromLexerGroups(lexResult.groups),
  };
}
