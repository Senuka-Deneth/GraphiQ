import { assertNever } from "@graphiq/uml-core";
import {
  type LifelineElement,
  type MessageRelationship,
  type TimingStateElement,
  type UmlElement,
  type UmlModel,
  type UmlRelationship,
} from "@graphiq/uml-model";

function isPrintableLifeline(element: UmlElement): element is LifelineElement {
  return element.elementType === "lifeline";
}

function isTimingState(element: UmlElement): element is TimingStateElement {
  return element.elementType === "timingState";
}

function isMessageRelationship(relationship: UmlRelationship): relationship is MessageRelationship {
  return relationship.relationshipType === "message";
}

function messageArrowToken(messageSort: MessageRelationship["messageSort"]): string {
  switch (messageSort) {
    case "synchCall":
      return "->";
    case "asynchCall":
    case "asynchSignal":
      return "->>";
    case "reply":
      return "-->>";
    case "createMessage":
      return "-->";
    case "deleteMessage":
      return "->";
    default:
      return assertNever(messageSort);
  }
}

function printLifeline(element: LifelineElement): string {
  if (element.classifierName !== undefined) {
    return `lifeline ${element.name}: ${element.classifierName}`;
  }
  return `lifeline ${element.name}`;
}

function printStateBlock(
  lifeline: LifelineElement,
  model: UmlModel,
): string[] {
  const states = model.elements
    .filter(
      (element): element is TimingStateElement =>
        isTimingState(element) && element.parentId === lifeline.id,
    )
    .sort((left, right) => left.at - right.at);

  if (states.length === 0) {
    return [];
  }

  const lines: string[] = [`${lifeline.name} {`];
  for (const state of states) {
    const duration = model.elements.find(
      (element) =>
        element.elementType === "durationConstraint" &&
        element.parentId === state.id,
    );
    const timeConstraint = model.elements.find(
      (element) =>
        element.elementType === "timeConstraint" &&
        element.parentId === state.id,
    );

    let line = `  ${state.name} @ ${state.at}`;
    if (duration?.elementType === "durationConstraint") {
      line += ` {${duration.min}..${duration.max}}`;
    } else if (timeConstraint?.elementType === "timeConstraint") {
      line += ` {${timeConstraint.time}}`;
    } else if (state.until !== undefined) {
      line += ` {${state.at}..${state.until}}`;
    }
    lines.push(line);
  }
  lines.push("}");
  return lines;
}

function printMessage(
  relationship: MessageRelationship,
  nameById: ReadonlyMap<string, string>,
): string {
  const sourceName = nameById.get(relationship.sourceId);
  const targetName = nameById.get(relationship.targetId);
  if (sourceName === undefined || targetName === undefined) {
    throw new Error("Message endpoints must reference printable lifelines");
  }

  const time = relationship.time ?? 0;
  const label =
    relationship.name !== undefined && relationship.name.length > 0
      ? ` : ${relationship.name}`
      : "";
  return `${sourceName} ${messageArrowToken(relationship.messageSort)} ${targetName} @ ${time}${label}`;
}

export function structuralTimingModel(model: UmlModel): {
  lifelines: readonly string[];
  stateBlocks: readonly { lifeline: string; states: readonly string[] }[];
  messages: readonly string[];
} {
  const lifelines = model.elements
    .filter(isPrintableLifeline)
    .map((element) => printLifeline(element));

  const stateBlocks = model.elements
    .filter(isPrintableLifeline)
    .map((lifeline) => ({
      lifeline: lifeline.name,
      states: model.elements
        .filter(
          (element): element is TimingStateElement =>
            isTimingState(element) && element.parentId === lifeline.id,
        )
        .sort((left, right) => left.at - right.at)
        .map((state) => `${state.name}@${state.at}`),
    }))
    .filter((block) => block.states.length > 0);

  const nameById = new Map(
    model.elements.filter(isPrintableLifeline).map((element) => [element.id, element.name]),
  );

  const messages = model.relationships
    .filter(isMessageRelationship)
    .map((relationship) => printMessage(relationship, nameById));

  return { lifelines, stateBlocks, messages };
}

export function printTiming(model: UmlModel, options?: { name?: string }): string {
  const lifelines = model.elements.filter(isPrintableLifeline);
  const nameById = new Map(lifelines.map((element) => [element.id, element.name]));

  const lines: string[] = [
    options?.name !== undefined ? `diagram timing ${options.name}` : "diagram timing",
    "",
  ];

  for (const lifeline of lifelines) {
    lines.push(printLifeline(lifeline));
  }

  if (lifelines.length > 0) {
    lines.push("");
  }

  for (const lifeline of lifelines) {
    lines.push(...printStateBlock(lifeline, model));
    lines.push("");
  }

  for (const relationship of model.relationships) {
    if (isMessageRelationship(relationship)) {
      lines.push(printMessage(relationship, nameById));
    }
  }

  return lines.join("\n").trimEnd() + "\n";
}
