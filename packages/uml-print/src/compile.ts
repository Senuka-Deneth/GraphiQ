import { createId, type Diagnostic, type DiagramKind } from "@graphiq/uml-core";
import {
  KIND_MISMATCH_RULE_ID,
  PARSE_RULE_ID,
  PARSER_FAILURE_RULE_ID,
  detectMarkupKind,
  isSequenceMarkup,
  parse,
  parseSequenceMarkup,
  translatePlantUml,
  type DiagramAst,
  type DslComment,
  type SequenceDiagramAst,
} from "@graphiq/uml-dsl";
import type { UmlModel } from "@graphiq/uml-model";
import { astToModel } from "./astToModel.js";
import {
  createBuildContext,
  type CompilationSourceMap,
} from "./identity.js";
import { sequenceMarkupToModel } from "./sequenceMarkupToModel.js";

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
  if (detectMarkupKind(text) === kind) {
    if (kind === "sequence" && isSequenceMarkup(text)) {
      return compileSequenceMarkup(text, previous);
    }
    return compileTranslatedMarkup(kind, text, previous);
  }

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

function compileTranslatedMarkup(
  kind: DiagramKind,
  text: string,
  previous?: UmlModel,
): CompilationResult {
  const translated = translatePlantUml(text);
  if (translated === null || translated.kind !== kind) {
    return {
      comments: [],
      diagnostics: [
        {
          id: createId(),
          ruleId: PARSE_RULE_ID,
          severity: "error",
          message: "This text is not PlantUML markup for the open diagram.",
          elementIds: [],
        },
      ],
      sourceMap: emptySourceMap(),
    };
  }
  const parsed = parse(kind, translated.dsl);
  if (!parsed.ok || hasBlockingParseErrors(parsed.value.diagnostics)) {
    return {
      comments: [],
      diagnostics: [...translated.diagnostics, ...(parsed.ok ? parsed.value.diagnostics : parsed.error.diagnostics)],
      sourceMap: emptySourceMap(),
    };
  }
  const context = createBuildContext(previous?.kind === kind ? previous : undefined);
  try {
    const model = astToModel(parsed.value.ast, previous?.kind === kind ? previous : undefined, context);
    return {
      model,
      ast: parsed.value.ast,
      comments: parsed.value.comments,
      diagnostics: [...translated.diagnostics, ...parsed.value.diagnostics, ...context.identity.diagnostics],
      sourceMap: context.identity.sourceMap,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected compilation failure";
    return {
      ast: parsed.value.ast,
      comments: [],
      diagnostics: [
        ...translated.diagnostics,
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
}

function compileSequenceMarkup(text: string, previous?: UmlModel): CompilationResult {
  const parsed = parseSequenceMarkup(text);
  const built = sequenceMarkupToModel(parsed.document, previous, parsed.diagnostics);
  const ast: SequenceDiagramAst = {
    kind: "sequence",
    ...(parsed.document.title !== undefined ? { name: parsed.document.title } : {}),
    lifelines: [],
    combinedFragments: [],
    messages: [],
    interactions: [],
    span: parsed.document.span,
  };
  return {
    model: built.model,
    ast,
    comments: [],
    diagnostics: built.diagnostics,
    sourceMap: built.sourceMap,
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
