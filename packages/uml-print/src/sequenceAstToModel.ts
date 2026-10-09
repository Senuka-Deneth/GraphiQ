import { createId } from "@graphiq/uml-core";
import type { SequenceDiagramAst } from "@graphiq/uml-dsl";
import {
  emptyModel,
  type CombinedFragmentElement,
  type LifelineElement,
  type MessageRelationship,
  type UmlElement,
  type UmlModel,
} from "@graphiq/uml-model";
import type { BuildContext } from "./identity.js";
import { createBuildContext } from "./identity.js";

function preservedNonDslElements(previous: UmlModel | undefined): UmlElement[] {
  if (!previous) {
    return [];
  }

  return previous.elements.filter((element) => element.elementType === "note");
}

function addDeclaredLifeline(
  model: UmlModel,
  lifeline: SequenceDiagramAst["lifelines"][number],
  identity: BuildContext["identity"],
): UmlModel {
  const claim = identity.allocateElement({
    elementType: "lifeline",
    name: lifeline.name,
    span: lifeline.span,
  });
  const previous = claim.previous?.elementType === "lifeline" ? claim.previous : undefined;
  const classifierName = lifeline.classifierName ?? previous?.classifierName;
  const element: LifelineElement = {
    id: claim.id,
    elementType: "lifeline",
    name: lifeline.name,
    ...(classifierName !== undefined ? { classifierName } : {}),
  };

  return {
    ...model,
    elements: [...model.elements.filter((item) => item.id !== element.id), element],
  };
}

function addMessageToModel(
  model: UmlModel,
  message: SequenceDiagramAst["messages"][number],
  identity: BuildContext["identity"],
  interactionIndex?: number,
): { model: UmlModel; messageId?: string } {
  const sourceId = identity.resolve(model, message.sourceName, message.sourceNameSpan, {
    elementType: "lifeline",
  });
  const targetId = identity.resolve(model, message.targetName, message.targetNameSpan, {
    elementType: "lifeline",
  });
  if (sourceId === undefined || targetId === undefined) {
    return { model };
  }

  const claim = identity.allocateRelationship({
    sourceId,
    targetId,
    relationshipType: "message",
    name: message.name,
    discriminator: message.messageSort,
    span: message.span,
  });
  const nextRelationship: MessageRelationship = {
    id: claim.id,
    relationshipType: "message",
    sourceId,
    targetId,
    messageSort: message.messageSort,
    ...(message.name !== undefined ? { name: message.name } : {}),
    ...(interactionIndex !== undefined ? { interactionIndex } : {}),
  };

  return {
    model: {
      ...model,
      relationships: [...model.relationships, nextRelationship],
    },
    messageId: nextRelationship.id,
  };
}

export function synthesizeSequenceExecutionSpecs(
  model: UmlModel,
  previous?: UmlModel,
): UmlModel {
  const withoutSpecs = model.elements.filter(
    (element) => element.elementType !== "executionSpecification",
  );

  const executionSpecs: UmlElement[] = [];
  const unmatchedSynchCalls: MessageRelationship[] = [];

  for (const relationship of model.relationships) {
    if (relationship.relationshipType !== "message") {
      continue;
    }

    if (relationship.messageSort === "synchCall") {
      unmatchedSynchCalls.push(relationship);
      const previousSpec = previous?.elements.find(
        (element) =>
          element.elementType === "executionSpecification" &&
          element.startMessageId === relationship.id,
      );
      executionSpecs.push({
        id: previousSpec?.id ?? createId(),
        elementType: "executionSpecification",
        name: `exec-${relationship.id.slice(0, 8)}`,
        parentId: relationship.targetId,
        startMessageId: relationship.id,
      });
      continue;
    }

    if (relationship.messageSort !== "reply") {
      continue;
    }

    const matchIndex = unmatchedSynchCalls.findIndex(
      (candidate) =>
        candidate.sourceId === relationship.targetId &&
        candidate.targetId === relationship.sourceId,
    );
    if (matchIndex === -1) {
      continue;
    }

    const matched = unmatchedSynchCalls[matchIndex];
    unmatchedSynchCalls.splice(matchIndex, 1);
    const specIndex = executionSpecs.findIndex(
      (element) =>
        element.elementType === "executionSpecification" &&
        element.startMessageId === matched?.id,
    );
    if (specIndex !== -1 && matched !== undefined) {
      const current = executionSpecs[specIndex];
      if (current?.elementType === "executionSpecification") {
        executionSpecs[specIndex] = {
          ...current,
          finishMessageId: relationship.id,
        };
      }
    }
  }

  return {
    ...model,
    elements: [...withoutSpecs, ...executionSpecs],
  };
}

export function sequenceAstToModel(
  ast: SequenceDiagramAst,
  previous?: UmlModel,
  context?: BuildContext,
): UmlModel {
  const identity = context?.identity ?? createBuildContext(previous).identity;
  const base = previous ?? emptyModel("sequence");
  let model: UmlModel = {
    id: base.id,
    kind: "sequence",
    elements: preservedNonDslElements(previous),
    relationships: [],
  };

  for (const lifeline of ast.lifelines) {
    model = addDeclaredLifeline(model, lifeline, identity);
  }

  let interactionIndex = 0;
  for (const interaction of ast.interactions) {
    if (interaction.interactionKind === "message") {
      const result = addMessageToModel(model, interaction.message, identity, interactionIndex);
      model = result.model;
      interactionIndex += 1;
      continue;
    }

    const fragment = interaction.fragment;
    const operandMessageIds: { guard?: string; messageIds: string[] }[] = [];
    for (const operand of fragment.operands) {
      const messageIds: string[] = [];
      for (const message of operand.messages) {
        const result = addMessageToModel(model, message, identity);
        model = result.model;
        if (result.messageId !== undefined) {
          messageIds.push(result.messageId);
        }
      }
      operandMessageIds.push({
        ...(operand.guard !== undefined ? { guard: operand.guard } : {}),
        messageIds,
      });
    }

    const claim = identity.allocateElement({
      elementType: "combinedFragment",
      name: fragment.operator,
      anonymous: true,
      span: fragment.span,
    });
    const previousFragment =
      claim.previous?.elementType === "combinedFragment" ? claim.previous : undefined;
    const element: CombinedFragmentElement = {
      id: claim.id,
      elementType: "combinedFragment",
      name: previousFragment?.name ?? `${fragment.operator}-${claim.id.slice(0, 8)}`,
      operator: fragment.operator,
      operands: operandMessageIds,
      interactionIndex,
    };
    model = {
      ...model,
      elements: [...model.elements, element],
    };
    interactionIndex += 1;
  }

  return synthesizeSequenceExecutionSpecs(model, previous);
}
