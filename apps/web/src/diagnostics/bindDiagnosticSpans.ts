import type { Diagnostic } from "@graphiq/uml-core";
import type { ClassDiagramAst, DiagramAst, ObjectDiagramAst } from "@graphiq/uml-dsl";
import type { UmlModel } from "@graphiq/uml-model";

function findClassRelationshipSpan(
  ast: ClassDiagramAst,
  sourceName: string,
  targetName: string,
  relationshipType: string,
) {
  return ast.relationships.find(
    (relationship) =>
      relationship.sourceName === sourceName &&
      relationship.targetName === targetName &&
      relationship.relationshipType === relationshipType,
  )?.span;
}

function findClassClassifierSpan(ast: ClassDiagramAst, name: string) {
  return ast.classifiers.find((classifier) => classifier.name === name)?.span;
}

function findObjectRelationshipSpan(
  ast: ObjectDiagramAst,
  sourceName: string,
  targetName: string,
  relationshipType: string,
) {
  return ast.relationships.find(
    (relationship) =>
      relationship.sourceName === sourceName &&
      relationship.targetName === targetName &&
      relationship.relationshipType === relationshipType,
  )?.span;
}

function findObjectInstanceSpan(ast: ObjectDiagramAst, name: string) {
  return ast.instances.find((instance) => instance.name === name)?.span;
}

function bindOneDiagnostic(
  ast: DiagramAst,
  model: UmlModel,
  diagnostic: Diagnostic,
): Diagnostic {
  if (diagnostic.dslSpan !== undefined) {
    return diagnostic;
  }

  const nameById = new Map(model.elements.map((element) => [element.id, element.name]));

  for (const elementId of diagnostic.elementIds) {
    const relationship = model.relationships.find((item) => item.id === elementId);
    if (relationship !== undefined) {
      const sourceName = nameById.get(relationship.sourceId);
      const targetName = nameById.get(relationship.targetId);
      if (sourceName !== undefined && targetName !== undefined) {
        const span =
          ast.kind === "class"
            ? findClassRelationshipSpan(
                ast,
                sourceName,
                targetName,
                relationship.relationshipType,
              )
            : ast.kind === "object"
              ? findObjectRelationshipSpan(
                  ast,
                  sourceName,
                  targetName,
                  relationship.relationshipType,
                )
              : undefined;
        if (span !== undefined) {
          return { ...diagnostic, dslSpan: span };
        }
      }
    }

    const element = model.elements.find((item) => item.id === elementId);
    if (element !== undefined) {
      const span =
        ast.kind === "class"
          ? findClassClassifierSpan(ast, element.name)
          : ast.kind === "object"
            ? findObjectInstanceSpan(ast, element.name)
            : undefined;
      if (span !== undefined) {
        return { ...diagnostic, dslSpan: span };
      }
    }
  }

  return diagnostic;
}

export function bindDiagnosticSpans(
  ast: DiagramAst,
  model: UmlModel,
  diagnostics: readonly Diagnostic[],
): Diagnostic[] {
  return diagnostics.map((diagnostic) => bindOneDiagnostic(ast, model, diagnostic));
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
