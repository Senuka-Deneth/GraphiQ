export type Visibility = "public" | "private" | "protected" | "package";

export type Attribute = {
  id: string;
  visibility: Visibility;
  name: string;
  typeName: string;
  multiplicity?: string;
  defaultValue?: string;
};

export type OperationParameter = {
  name: string;
  typeName: string;
};

export type Operation = {
  id: string;
  visibility: Visibility;
  name: string;
  parameters: OperationParameter[];
  returnType?: string;
};

export type Slot = {
  featureName: string;
  value: string;
};

export type MessageSort =
  | "synchCall"
  | "asynchCall"
  | "asynchSignal"
  | "reply"
  | "createMessage"
  | "deleteMessage";

export type PseudostateKind =
  | "initial"
  | "shallowHistory"
  | "deepHistory"
  | "join"
  | "fork"
  | "junction"
  | "choice"
  | "entryPoint"
  | "exitPoint"
  | "terminate";

export type CombinedFragmentOperator =
  | "alt"
  | "opt"
  | "loop"
  | "par"
  | "break"
  | "critical"
  | "neg"
  | "ignore"
  | "consider"
  | "assert"
  | "seq"
  | "strict";
