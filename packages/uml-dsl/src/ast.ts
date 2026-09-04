import type { RelationshipType, Visibility } from "@graphiq/uml-model";

export type DslSpan = {
  start: number;
  end: number;
};

export type AstAttribute = {
  visibility: Visibility;
  name: string;
  typeName: string;
  multiplicity?: string;
  defaultValue?: string;
  span: DslSpan;
};

export type AstOperationParameter = {
  name: string;
  typeName: string;
};

export type AstOperation = {
  visibility: Visibility;
  name: string;
  parameters: AstOperationParameter[];
  returnType?: string;
  span: DslSpan;
};

export type AstClassClassifier = {
  classifierKind: "class";
  name: string;
  isAbstract: boolean;
  attributes: AstAttribute[];
  operations: AstOperation[];
  span: DslSpan;
};

export type AstInterfaceClassifier = {
  classifierKind: "interface";
  name: string;
  attributes: AstAttribute[];
  operations: AstOperation[];
  span: DslSpan;
};

export type AstEnumerationClassifier = {
  classifierKind: "enumeration";
  name: string;
  literals: string[];
  span: DslSpan;
};

export type AstClassifier =
  | AstClassClassifier
  | AstInterfaceClassifier
  | AstEnumerationClassifier;

export type AstRelationship = {
  sourceName: string;
  targetName: string;
  relationshipType: RelationshipType;
  sourceMultiplicity?: string;
  targetMultiplicity?: string;
  name?: string;
  span: DslSpan;
};

export type ClassDiagramAst = {
  kind: "class";
  name?: string;
  classifiers: AstClassifier[];
  relationships: AstRelationship[];
  span: DslSpan;
};

export type AstSlot = {
  featureName: string;
  value: string;
  span: DslSpan;
};

export type AstInstance = {
  name: string;
  classifierName: string;
  slots: AstSlot[];
  span: DslSpan;
};

export type AstObjectRelationship = {
  sourceName: string;
  targetName: string;
  relationshipType: Extract<RelationshipType, "link" | "dependency">;
  name?: string;
  span: DslSpan;
};

export type ObjectDiagramAst = {
  kind: "object";
  name?: string;
  instances: AstInstance[];
  relationships: AstObjectRelationship[];
  span: DslSpan;
};

export type AstPackageBodyItem =
  | {
      itemKind: "nestedPackage";
      name: string;
      items: AstPackageBodyItem[];
      span: DslSpan;
    }
  | {
      itemKind: "classifier";
      classifier: AstClassifier;
      span: DslSpan;
    };

export type AstPackageDeclaration = {
  name: string;
  items: AstPackageBodyItem[];
  span: DslSpan;
};

export type AstPackageRelationship = {
  sourceName: string;
  targetName: string;
  relationshipType: Extract<
    RelationshipType,
    "packageImport" | "packageMerge" | "dependency"
  >;
  span: DslSpan;
};

export type PackageDiagramAst = {
  kind: "package";
  name?: string;
  packages: AstPackageDeclaration[];
  relationships: AstPackageRelationship[];
  span: DslSpan;
};

export type DiagramAst = ClassDiagramAst | ObjectDiagramAst | PackageDiagramAst;
