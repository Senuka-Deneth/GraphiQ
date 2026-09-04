import { createId } from "@graphiq/uml-core";
import type { SequenceDiagramAst } from "@graphiq/uml-dsl";
import {
  emptyModel,
  type CombinedFragmentElement,
  type LifelineElement,
  type MessageRelationship,
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

function findPreviousLifeline(
  previous: UmlModel | undefined,
  name: string,
): LifelineElement | undefined {
  if (!previous) {
    return undefined;
  }

  const element = previous.elements.find(
    (item) => item.elementType === "lifeline" && item.name === name,
  );
  return element?.elementType === "lifeline" ? element : undefined;
}

function findPreviousFragment(
  previous: UmlModel | undefined,
  operator: CombinedFragmentElement["operator"],
  operandCount: number,
): CombinedFragmentElement | undefined {
  if (!previous) {
    return undefined;
  }

  return previous.elements.find(
    (item) =>
      item.elementType === "combinedFragment" &&
      item.operator === operator &&
      item.operands.length === operandCount,
  ) as CombinedFragmentElement | undefined;
}

function findPreviousMessage(
  previous: UmlModel | undefined,
  sourceId: string,
  targetId: string,
  messageSort: MessageRelationship["messageSort"],
  name?: string,
): UmlRelationship | undefined {
  if (!previous) {
    return undefined;
  }

  return previous.relationships.find((relationship) => {
    if (relationship.relationshipType !== "message") {
      return false;
    }
    return (
      relationship.sourceId === sourceId &&
      relationship.targetId === targetId &&
      relationship.messageSort === messageSort &&
      relationship.name === name
    );
  });
}

function elementIdByName(model: UmlModel, name: string): string {
  const element = model.elements.find((item) => item.name === name);
  if (element === undefined) {
    throw new Error(`Element "${name}" was not found`);
  }
  return element.id;
}

function ensureLifelineByName(
  model: UmlModel,
  name: string,
  classifierName: string | undefined,
  previous?: UmlModel,
): UmlModel {
  const existing = model.elements.find((element) => element.name === name);
  if (existing !== undefined) {
    if (
      existing.elementType === "lifeline" &&
      classifierName !== undefined &&
      existing.classifierName !== classifierName
    ) {
      return {
        ...model,
        elements: model.elements.map((element) =>
          element.id === existing.id && element.elementType === "lifeline"
            ? { ...element, classifierName }
            : element,
        ),
      };
    }
    return model;
  }

  const previousLifeline = findPreviousLifeline(previous, name);
  const element: LifelineElement = {
    id: previousLifeline?.id ?? createId(),
    elementType: "lifeline",
    name,
    ...(classifierName !== undefined ? { classifierName } : {}),
  };

  return {
    ...model,
    elements: [...model.elements, element],
  };
}

function addMessageToModel(
  model: UmlModel,
  sourceName: string,
  targetName: string,
  messageSort: MessageRelationship["messageSort"],
  name: string | undefined,
  previous?: UmlModel,
): { model: UmlModel; messageId: string } {
  const working = ensureLifelineByName(model, sourceName, undefined, previous);
  const withTarget = ensureLifelineByName(working, targetName, undefined, previous);
  const sourceId = elementIdByName(withTarget, sourceName);
  const targetId = elementIdByName(withTarget, targetName);

  const previousMessage = findPreviousMessage(
    previous,
    sourceId,
    targetId,
    messageSort,
    name,
  );

  const nextRelationship: MessageRelationship = {
    id: previousMessage?.id ?? createId(),
    relationshipType: "message",
    sourceId,
    targetId,
    messageSort,
    ...(name !== undefined ? { name } : {}),
  };

  return {
    model: {
      ...withTarget,
      relationships: [...withTarget.relationships, nextRelationship],
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
): UmlModel {
  const base = previous ?? emptyModel("sequence");
  let model: UmlModel = {
    id: base.id,
    kind: "sequence",
    elements: preservedNonDslElements(previous),
    relationships: [],
  };

  for (const lifeline of ast.lifelines) {
    model = ensureLifelineByName(model, lifeline.name, lifeline.classifierName, previous);
  }

  for (const message of ast.messages) {
    const result = addMessageToModel(
      model,
      message.sourceName,
      message.targetName,
      message.messageSort,
      message.name,
      previous,
    );
    model = result.model;
  }

  for (const fragment of ast.combinedFragments) {
    const operandMessageIds: { guard?: string; messageIds: string[] }[] = [];

    for (const operand of fragment.operands) {
      const messageIds: string[] = [];
      for (const message of operand.messages) {
        const result = addMessageToModel(
          model,
          message.sourceName,
          message.targetName,
          message.messageSort,
          message.name,
          previous,
        );
        model = result.model;
        messageIds.push(result.messageId);
      }
      operandMessageIds.push({
        ...(operand.guard !== undefined ? { guard: operand.guard } : {}),
        messageIds,
      });
    }

    const previousFragment = findPreviousFragment(
      previous,
      fragment.operator,
      operandMessageIds.length,
    );
    const element: CombinedFragmentElement = {
      id: previousFragment?.id ?? createId(),
      elementType: "combinedFragment",
      name: previousFragment?.name ?? `${fragment.operator}-${createId().slice(0, 8)}`,
      operator: fragment.operator,
      operands: operandMessageIds,
    };

    model = {
      ...model,
      elements: [...model.elements.filter((item) => item.id !== element.id), element],
    };
  }

  return synthesizeSequenceExecutionSpecs(model, previous);
}
