export type Severity = "error" | "warning";

export type DslSpan = {
  start: number;
  end: number;
};

export type Diagnostic = {
  id: string;
  ruleId: string;
  severity: Severity;
  message: string;
  elementIds: string[];
  dslSpan?: DslSpan;
};
