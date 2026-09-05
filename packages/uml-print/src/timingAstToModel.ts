import { createId } from "@graphiq/uml-core";
import type { TimingDiagramAst } from "@graphiq/uml-dsl";
import {
  emptyModel,
  type LifelineElement,
  type MessageRelationship,
  type TimingStateElement,
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

function findPreviousTimingState(
  previous: UmlModel | undefined,
  lifelineId: string,
  name: string,
  at: number,
): TimingStateElement | undefined {
  if (!previous) {
    return undefined;
  }

  return previous.elements.find(
    (item) =>
      item.elementType === "timingState" &&
      item.parentId === lifelineId &&
      item.name === name &&
      item.at === at,
  ) as TimingStateElement | undefined;
}

function findPreviousMessage(
  previous: UmlModel | undefined,
  sourceId: string,
  targetId: string,
  messageSort: MessageRelationship["messageSort"],
  time: number,
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
      relationship.time === time &&
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

export function timingAstToModel(
  ast: TimingDiagramAst,
  previous?: UmlModel,
): UmlModel {
  const base = previous ?? emptyModel("timing");
  let model: UmlModel = {
    id: base.id,
    kind: "timing",
    elements: preservedNonDslElements(previous),
    relationships: [],
  };

  for (const lifeline of ast.lifelines) {
    model = ensureLifelineByName(model, lifeline.name, lifeline.classifierName, previous);
  }

  for (const block of ast.stateBlocks) {
    model = ensureLifelineByName(model, block.lifelineName, undefined, previous);
    const lifelineId = elementIdByName(model, block.lifelineName);

    for (const state of block.states) {
      const previousState = findPreviousTimingState(
        previous,
        lifelineId,
        state.name,
        state.at,
      );
      const until =
        state.constraint?.constraintKind === "duration"
          ? state.constraint.max
          : undefined;

      const stateElement: TimingStateElement = {
        id: previousState?.id ?? createId(),
        elementType: "timingState",
        name: state.name,
        parentId: lifelineId,
        at: state.at,
        ...(until !== undefined ? { until } : {}),
      };

      model = {
        ...model,
        elements: [
          ...model.elements.filter((element) => element.id !== stateElement.id),
          stateElement,
        ],
      };

      if (state.constraint?.constraintKind === "duration") {
        const constraintId = createId();
        model = {
          ...model,
          elements: [
            ...model.elements.filter(
              (element) =>
                !(
                  element.elementType === "durationConstraint" &&
                  element.parentId === stateElement.id
                ),
            ),
            {
              id: constraintId,
              elementType: "durationConstraint",
              name: `${state.name}-duration`,
              parentId: stateElement.id,
              min: state.constraint.min,
              max: state.constraint.max,
            },
          ],
        };
      } else if (state.constraint?.constraintKind === "time") {
        model = {
          ...model,
          elements: [
            ...model.elements.filter(
              (element) =>
                !(
                  element.elementType === "timeConstraint" &&
                  element.parentId === stateElement.id
                ),
            ),
            {
              id: createId(),
              elementType: "timeConstraint",
              name: `${state.name}-time`,
              parentId: stateElement.id,
              time: state.constraint.time,
            },
          ],
        };
      }
    }
  }

  for (const message of ast.messages) {
    model = ensureLifelineByName(model, message.sourceName, undefined, previous);
    model = ensureLifelineByName(model, message.targetName, undefined, previous);

    const sourceId = elementIdByName(model, message.sourceName);
    const targetId = elementIdByName(model, message.targetName);
    const previousMessage = findPreviousMessage(
      previous,
      sourceId,
      targetId,
      message.messageSort,
      message.at,
      message.name,
    );

    const relationship: MessageRelationship = {
      id: previousMessage?.id ?? createId(),
      relationshipType: "message",
      sourceId,
      targetId,
      messageSort: message.messageSort,
      time: message.at,
      ...(message.name !== undefined ? { name: message.name } : {}),
    };

    model = {
      ...model,
      relationships: [
        ...model.relationships.filter((item) => item.id !== relationship.id),
        relationship,
      ],
    };
  }

  return model;
}
