import { createId, type Diagnostic, type DiagramKind } from "@graphiq/uml-core";
import {
  KIND_MISMATCH_RULE_ID,
  PARSE_RULE_ID,
  PARSER_FAILURE_RULE_ID,
  parse,
  type DiagramAst,
  type DslComment,
} from "@graphiq/uml-dsl";
import type { UmlModel } from "@graphiq/uml-model";
import { astToModel } from "./astToModel.js";
import {
  createBuildContext,
  type CompilationSourceMap,
} from "./identity.js";

export type CompilationResult = {
  model?: UmlModel;
  ast?: DiagramAst;
  comments: DslComment[];
  diagnostics: Diagnostic[];
  sourceMap: CompilationSourceMap;
};

const emptySourceMap = (): CompilationSourceMap => ({ entries: [] });

export function compileDiagram(
  kind: DiagramKind,
  text: string,
  previous?: UmlModel,
): CompilationResult {
  const parsed = parse(kind, text);
  if (!parsed.ok) {
    return {
      comments: [],
      diagnostics: parsed.error.diagnostics,
      sourceMap: emptySourceMap(),
    };
  }

  const context = createBuildContext(previous);
  let model: UmlModel;
  try {
    model = astToModel(parsed.value.ast, previous, context);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected compilation failure";
    return {
      ast: parsed.value.ast,
      comments: parsed.value.comments,
      diagnostics: [
        ...parsed.value.diagnostics,
        {
          id: createId(),
          ruleId: PARSER_FAILURE_RULE_ID,
          severity: "error",
          message,
          elementIds: [],
        },
      ],
      sourceMap: context.identity.sourceMap,
    };
  }

  return {
    model,
    ast: parsed.value.ast,
    comments: parsed.value.comments,
    diagnostics: [...parsed.value.diagnostics, ...context.identity.diagnostics],
    sourceMap: context.identity.sourceMap,
  };
}

export function hasBlockingParseErrors(diagnostics: readonly Diagnostic[]): boolean {
  return diagnostics.some(
    (diagnostic) =>
      diagnostic.severity === "error" &&
      (diagnostic.ruleId === PARSE_RULE_ID ||
        diagnostic.ruleId === KIND_MISMATCH_RULE_ID ||
        diagnostic.ruleId === PARSER_FAILURE_RULE_ID),
  );
}
