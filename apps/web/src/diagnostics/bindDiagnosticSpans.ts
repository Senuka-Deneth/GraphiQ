import type { Diagnostic } from "@graphiq/uml-core";
import type { ClassDiagramAst } from "@graphiq/uml-dsl";
import type { UmlModel } from "@graphiq/uml-model";

function findAstRelationshipSpan(
  ast: ClassDiagramAst,
  sourceName: string,
  targetName: string,
  relationshipType: string,
): { start: number; end: number } | undefined {
  const match = ast.relationships.find(
    (relationship) =>
      relationship.sourceName === sourceName &&
      relationship.targetName === targetName &&
      relationship.relationshipType === relationshipType,
  );
  return match?.span;
}

function findAstClassifierSpan(
  ast: ClassDiagramAst,
  name: string,
): { start: number; end: number } | undefined {
  const match = ast.classifiers.find((classifier) => classifier.name === name);
  return match?.span;
}

export function bindClassDiagnosticSpans(
  ast: ClassDiagramAst,
  model: UmlModel,
  diagnostics: readonly Diagnostic[],
): Diagnostic[] {
  const nameById = new Map(model.elements.map((element) => [element.id, element.name]));

  return diagnostics.map((diagnostic) => {
    if (diagnostic.dslSpan !== undefined) {
      return diagnostic;
    }

    for (const elementId of diagnostic.elementIds) {
      const relationship = model.relationships.find((item) => item.id === elementId);
      if (relationship !== undefined) {
        const sourceName = nameById.get(relationship.sourceId);
        const targetName = nameById.get(relationship.targetId);
        if (sourceName !== undefined && targetName !== undefined) {
          const span = findAstRelationshipSpan(
            ast,
            sourceName,
            targetName,
            relationship.relationshipType,
          );
          if (span !== undefined) {
            return { ...diagnostic, dslSpan: span };
          }
        }
      }

      const element = model.elements.find((item) => item.id === elementId);
      if (element !== undefined) {
        const span = findAstClassifierSpan(ast, element.name);
        if (span !== undefined) {
          return { ...diagnostic, dslSpan: span };
        }
      }
    }

    return diagnostic;
  });
}

export type DiagnosticSeverity = "error" | "warning";

export function buildDiagnosticSeverityMap(
  diagnostics: readonly Diagnostic[],
): Map<string, DiagnosticSeverity> {
  const map = new Map<string, DiagnosticSeverity>();

  for (const diagnostic of diagnostics) {
    for (const elementId of diagnostic.elementIds) {
      const existing = map.get(elementId);
      if (existing === "error") {
        continue;
      }
      if (diagnostic.severity === "error") {
        map.set(elementId, "error");
      } else if (existing === undefined) {
        map.set(elementId, "warning");
      }
    }
  }

  return map;
}
