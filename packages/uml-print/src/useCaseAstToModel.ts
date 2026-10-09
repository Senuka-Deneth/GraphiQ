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
import { createBuildContext, type BuildContext, type IdentityTable } from "./identity.js";

function preservedNonDslElements(previous: UmlModel | undefined): UmlElement[] {
  if (!previous) {
    return [];
  }

  return previous.elements.filter((element) => element.elementType === "note");
}

function addNamedElement(
  model: UmlModel,
  elementType: Extract<UmlElement["elementType"], "actor" | "useCase" | "subject">,
  name: string,
  identity: IdentityTable,
  span?: UseCaseDiagramAst["span"],
  parentId?: string,
): { model: UmlModel; id: string } {
  const claim = identity.allocateElement({
    elementType,
    name,
    parentId,
    span,
  });
  const element: UmlElement = {
    id: claim.id,
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
  identity: IdentityTable,
): UmlModel {
  let nextModel = model;
  for (const useCase of subject.useCases) {
    nextModel = addUseCases(nextModel, useCase, identity, subjectId).model;
  }
  return nextModel;
}

function addUseCases(
  model: UmlModel,
  useCase: AstUseCaseDeclaration,
  identity: IdentityTable,
  parentId?: string,
): { model: UmlModel; id: string } {
  return addNamedElement(model, "useCase", useCase.name, identity, useCase.span, parentId);
}

function addRelationshipIfMissing(
  model: UmlModel,
  relationship: AstUseCaseRelationship,
  sourceId: string,
  targetId: string,
  identity: IdentityTable,
): UmlModel {
  const claim = identity.allocateRelationship({
    sourceId,
    targetId,
    relationshipType: relationship.relationshipType,
    name: relationship.stereotype,
    span: relationship.span,
  });

  const nextRelationship: UmlRelationship =
    relationship.relationshipType === "association"
      ? {
          id: claim.id,
          relationshipType: "association",
          sourceId,
          targetId,
          sourceMultiplicity: "1",
          targetMultiplicity: "1",
        }
      : {
          id: claim.id,
          relationshipType: relationship.relationshipType,
          sourceId,
          targetId,
          ...(relationship.stereotype !== undefined ? { name: relationship.stereotype } : {}),
        };

  return {
    ...model,
    relationships: [...model.relationships, nextRelationship],
  };
}

type AstUseCaseRelationship = UseCaseDiagramAst["relationships"][number];

export function useCaseAstToModel(
  ast: UseCaseDiagramAst,
  previous?: UmlModel,
  context?: BuildContext,
): UmlModel {
  const identity = context?.identity ?? createBuildContext(previous).identity;
  const base = previous ?? emptyModel("useCase");
  let model: UmlModel = {
    id: base.id,
    kind: "useCase",
    elements: preservedNonDslElements(previous),
    relationships: [],
  };

  for (const actor of ast.actors) {
    model = addNamedElement(model, "actor", actor.name, identity, actor.span).model;
  }

  for (const subject of ast.subjects) {
    const added = addNamedElement(model, "subject", subject.name, identity, subject.span);
    model = addUseCasesFromSubject(added.model, subject, added.id, identity);
  }

  for (const useCase of ast.useCases) {
    model = addUseCases(model, useCase, identity).model;
  }

  for (const relationship of ast.relationships) {
    const sourceId = identity.resolve(
      model,
      relationship.sourceName,
      relationship.sourceNameSpan ?? relationship.span,
    );
    const targetId = identity.resolve(
      model,
      relationship.targetName,
      relationship.targetNameSpan ?? relationship.span,
    );
    if (sourceId === undefined || targetId === undefined) {
      continue;
    }

    model = addRelationshipIfMissing(model, relationship, sourceId, targetId, identity);
  }

  return model;
}
