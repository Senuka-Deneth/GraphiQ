import { createId } from "@graphiq/uml-core";
import type {
  AstSubjectDeclaration,
  AstUseCaseDeclaration,
  UseCaseDiagramAst,
} from "@graphiq/uml-dsl";
import {
  emptyModel,
  type UmlElement,
  type UmlModel,
  type UmlRelationship,
} from "@graphiq/uml-model";

function preservedNonDslElements(previous: UmlModel | undefined): UmlElement[] {
  if (!previous) {
    return [];
  }

  return previous.elements.filter((element) => element.elementType === "note");
}

function findPreviousElement(
  previous: UmlModel | undefined,
  name: string,
  elementType: UmlElement["elementType"],
  parentId?: string,
): UmlElement | undefined {
  if (!previous) {
    return undefined;
  }

  return previous.elements.find(
    (element) =>
      element.name === name &&
      element.elementType === elementType &&
      element.parentId === parentId,
  );
}

function findPreviousRelationship(
  previous: UmlModel | undefined,
  sourceId: string,
  targetId: string,
  relationshipType: UmlRelationship["relationshipType"],
): UmlRelationship | undefined {
  if (!previous) {
    return undefined;
  }

  return previous.relationships.find(
    (relationship) =>
      relationship.sourceId === sourceId &&
      relationship.targetId === targetId &&
      relationship.relationshipType === relationshipType,
  );
}

function addNamedElement(
  model: UmlModel,
  elementType: Extract<UmlElement["elementType"], "actor" | "useCase" | "subject">,
  name: string,
  previous?: UmlModel,
  parentId?: string,
): { model: UmlModel; id: string } {
  const previousElement = findPreviousElement(previous, name, elementType, parentId);
  const element: UmlElement = {
    id: previousElement?.id ?? createId(),
    elementType,
    name,
    ...(parentId !== undefined ? { parentId } : {}),
  };

  return {
    model: {
      ...model,
      elements: [...model.elements.filter((item) => item.id !== element.id), element],
    },
    id: element.id,
  };
}

function addUseCasesFromSubject(
  model: UmlModel,
  subject: AstSubjectDeclaration,
  subjectId: string,
  previous?: UmlModel,
): UmlModel {
  let nextModel = model;
  for (const useCase of subject.useCases) {
    nextModel = addUseCases(nextModel, useCase, previous, subjectId).model;
  }
  return nextModel;
}

function addUseCases(
  model: UmlModel,
  useCase: AstUseCaseDeclaration,
  previous?: UmlModel,
  parentId?: string,
): { model: UmlModel; id: string } {
  return addNamedElement(model, "useCase", useCase.name, previous, parentId);
}

function addRelationshipIfMissing(
  model: UmlModel,
  relationshipType: Exclude<AstUseCaseRelationship["relationshipType"], "dependency">,
  sourceId: string,
  targetId: string,
  previous?: UmlModel,
): UmlModel {
  if (
    model.relationships.some(
      (relationship) =>
        relationship.sourceId === sourceId &&
        relationship.targetId === targetId &&
        relationship.relationshipType === relationshipType,
    )
  ) {
    return model;
  }

  const previousRelationship = findPreviousRelationship(
    previous,
    sourceId,
    targetId,
    relationshipType,
  );

  const nextRelationship: UmlRelationship =
    relationshipType === "association"
      ? {
          id: previousRelationship?.id ?? createId(),
          relationshipType: "association",
          sourceId,
          targetId,
          sourceMultiplicity: "1",
          targetMultiplicity: "1",
        }
      : {
          id: previousRelationship?.id ?? createId(),
          relationshipType,
          sourceId,
          targetId,
        };

  return {
    ...model,
    relationships: [...model.relationships, nextRelationship],
  };
}

function findElementIdByName(model: UmlModel, name: string): string {
  const element = model.elements.find((item) => item.name === name);
  if (element === undefined) {
    throw new Error(`Element "${name}" was not found`);
  }
  return element.id;
}

type AstUseCaseRelationship = UseCaseDiagramAst["relationships"][number];

export function useCaseAstToModel(ast: UseCaseDiagramAst, previous?: UmlModel): UmlModel {
  const base = previous ?? emptyModel("useCase");
  let model: UmlModel = {
    id: base.id,
    kind: "useCase",
    elements: preservedNonDslElements(previous),
    relationships: [],
  };

  for (const actor of ast.actors) {
    model = addNamedElement(model, "actor", actor.name, previous).model;
  }

  for (const subject of ast.subjects) {
    const added = addNamedElement(model, "subject", subject.name, previous);
    model = addUseCasesFromSubject(added.model, subject, added.id, previous);
  }

  for (const useCase of ast.useCases) {
    model = addUseCases(model, useCase, previous).model;
  }

  for (const relationship of ast.relationships) {
    if (relationship.relationshipType === "dependency") {
      continue;
    }

    const sourceId = findElementIdByName(model, relationship.sourceName);
    const targetId = findElementIdByName(model, relationship.targetName);
    model = addRelationshipIfMissing(
      model,
      relationship.relationshipType,
      sourceId,
      targetId,
      previous,
    );
  }

  return model;
}
