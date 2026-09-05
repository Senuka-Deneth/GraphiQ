import type { AstClassifier, AstRelationship, ClassDiagramAst, DslComment, DslSpan } from "./ast.js";

export type ClassSourceClassifierChunk = {
  index: number;
  classifier: AstClassifier;
  leadingComments: DslComment[];
  trailingComments: DslComment[];
  declarationText: string;
  declarationSpan: DslSpan;
  fullText: string;
  fullSpan: DslSpan;
};

export type ClassSourceRelationshipChunk = {
  index: number;
  relationship: AstRelationship;
  leadingComments: DslComment[];
  trailingComments: DslComment[];
  declarationText: string;
  declarationSpan: DslSpan;
  fullText: string;
  fullSpan: DslSpan;
};

export type ClassSourceMap = {
  headerLeadingComments: DslComment[];
  headerText: string;
  headerSpan: DslSpan;
  classifiers: ClassSourceClassifierChunk[];
  relationships: ClassSourceRelationshipChunk[];
  trailerComments: DslComment[];
  trailerText: string;
  trailerSpan: DslSpan;
};

type OrderedDeclaration =
  | { kind: "classifier"; index: number; span: DslSpan }
  | { kind: "relationship"; index: number; span: DslSpan };

function lineEndAfter(text: string, offset: number): number {
  const newlineIndex = text.indexOf("\n", offset);
  return newlineIndex === -1 ? text.length : newlineIndex + 1;
}

function isSameLine(text: string, start: number, end: number): boolean {
  const between = text.slice(start, end);
  return !between.includes("\n");
}

function commentsBeforeDiagram(
  comments: readonly DslComment[],
  diagramStart: number,
): DslComment[] {
  return comments.filter((comment) => comment.span.end <= diagramStart);
}

function leadingCommentsBetween(
  comments: readonly DslComment[],
  previousEnd: number,
  declarationStart: number,
  text: string,
): DslComment[] {
  return comments.filter((comment) => {
    if (comment.span.start < previousEnd || comment.span.end > declarationStart) {
      return false;
    }
    const gap = text.slice(previousEnd, declarationStart);
    const relativeStart = comment.span.start - previousEnd;
    const beforeComment = gap.slice(0, relativeStart);
    return beforeComment.includes("\n") || previousEnd === 0;
  });
}

function trailingCommentsOnLine(
  comments: readonly DslComment[],
  declarationEnd: number,
  lineEnd: number,
  nextDeclarationStart: number,
  text: string,
): DslComment[] {
  const lineLimit = Math.min(lineEnd, nextDeclarationStart);
  return comments.filter(
    (comment) =>
      comment.span.start >= declarationEnd &&
      comment.span.end <= lineLimit &&
      isSameLine(text, declarationEnd, comment.span.start),
  );
}

function diagramHeaderEnd(text: string, diagramStart: number): number {
  const lineEnd = text.indexOf("\n", diagramStart);
  return lineEnd === -1 ? text.length : lineEnd + 1;
}

function buildChunk(
  text: string,
  comments: readonly DslComment[],
  previousEnd: number,
  declarationSpan: DslSpan,
  lineEnd: number,
  nextDeclarationStart: number,
): {
  leadingComments: DslComment[];
  trailingComments: DslComment[];
  declarationText: string;
  fullText: string;
  fullSpan: DslSpan;
} {
  const leadingComments = leadingCommentsBetween(
    comments,
    previousEnd,
    declarationSpan.start,
    text,
  );
  const trailingComments = trailingCommentsOnLine(
    comments,
    declarationSpan.end,
    lineEnd,
    nextDeclarationStart,
    text,
  );

  const leadingPrefixStart = previousEnd;
  const prefixText = text.slice(leadingPrefixStart, declarationSpan.start);
  const declarationText = text.slice(declarationSpan.start, declarationSpan.end);
  const lastTrailingComment = trailingComments.at(-1);
  const trailingEnd = lastTrailingComment?.span.end ?? lineEnd;
  const trailingText = text.slice(declarationSpan.end, trailingEnd);
  const fullText = prefixText + declarationText + trailingText;

  return {
    leadingComments,
    trailingComments,
    declarationText,
    fullText,
    fullSpan: {
      start: leadingPrefixStart,
      end: leadingPrefixStart + fullText.length,
    },
  };
}

export function buildClassSourceMap(
  text: string,
  ast: ClassDiagramAst,
  comments: readonly DslComment[],
): ClassSourceMap {
  const sortedComments = [...comments].sort((left, right) => left.span.start - right.span.start);
  const diagramStart = ast.span.start;

  const orderedDeclarations: OrderedDeclaration[] = [
    ...ast.classifiers.map((classifier, index) => ({
      kind: "classifier" as const,
      index,
      span: classifier.span,
    })),
    ...ast.relationships.map((relationship, index) => ({
      kind: "relationship" as const,
      index,
      span: relationship.span,
    })),
  ].sort((left, right) => left.span.start - right.span.start);

  const headerEnd = diagramHeaderEnd(text, diagramStart);
  const headerLeadingComments = commentsBeforeDiagram(sortedComments, diagramStart);
  const headerText = text.slice(0, headerEnd);
  const headerSpan: DslSpan = { start: 0, end: headerEnd };

  const classifierChunks: ClassSourceClassifierChunk[] = [];
  const relationshipChunks: ClassSourceRelationshipChunk[] = [];

  let previousEnd = headerEnd;

  for (let declarationIndex = 0; declarationIndex < orderedDeclarations.length; declarationIndex += 1) {
    const declaration = orderedDeclarations[declarationIndex];
    if (declaration === undefined) {
      continue;
    }
    const nextDeclaration = orderedDeclarations[declarationIndex + 1];
    const lineEnd = lineEndAfter(text, declaration.span.end);
    const nextStart = nextDeclaration?.span.start ?? text.length;

    const chunk = buildChunk(
      text,
      sortedComments,
      previousEnd,
      declaration.span,
      lineEnd,
      nextStart,
    );

    if (declaration.kind === "classifier") {
      const classifier = ast.classifiers[declaration.index];
      if (classifier === undefined) {
        continue;
      }
      classifierChunks.push({
        index: declaration.index,
        classifier,
        leadingComments: chunk.leadingComments,
        trailingComments: chunk.trailingComments,
        declarationText: chunk.declarationText,
        declarationSpan: declaration.span,
        fullText: chunk.fullText,
        fullSpan: chunk.fullSpan,
      });
    } else {
      const relationship = ast.relationships[declaration.index];
      if (relationship === undefined) {
        continue;
      }
      relationshipChunks.push({
        index: declaration.index,
        relationship,
        leadingComments: chunk.leadingComments,
        trailingComments: chunk.trailingComments,
        declarationText: chunk.declarationText,
        declarationSpan: declaration.span,
        fullText: chunk.fullText,
        fullSpan: chunk.fullSpan,
      });
    }

    previousEnd = chunk.fullSpan.end;
  }

  const trailerComments = sortedComments.filter((comment) => comment.span.start >= previousEnd);
  const trailerText = text.slice(previousEnd);
  const trailerSpan: DslSpan = { start: previousEnd, end: text.length };

  return {
    headerLeadingComments,
    headerText,
    headerSpan,
    classifiers: classifierChunks,
    relationships: relationshipChunks,
    trailerComments,
    trailerText,
    trailerSpan,
  };
}
