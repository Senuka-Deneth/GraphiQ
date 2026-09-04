import { assertNever } from "@graphiq/uml-core";
import {
  isClassifierElement,
  type CombinedFragmentElement,
  type LifelineElement,
  type MessageRelationship,
  type UmlElement,
  type UmlModel,
  type UmlRelationship,
} from "@graphiq/uml-model";

function isPrintableLifeline(element: UmlElement): element is LifelineElement {
  return element.elementType === "lifeline";
}

function isCombinedFragment(element: UmlElement): element is CombinedFragmentElement {
  return element.elementType === "combinedFragment";
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

function printMessage(
  relationship: MessageRelationship,
  nameById: ReadonlyMap<string, string>,
): string {
  const sourceName = nameById.get(relationship.sourceId);
  const targetName = nameById.get(relationship.targetId);
  if (sourceName === undefined || targetName === undefined) {
    throw new Error("Message endpoints must reference printable lifelines");
  }

  const label =
    relationship.name !== undefined && relationship.name.length > 0
      ? ` : ${relationship.name}`
      : "";
  return `${sourceName} ${messageArrowToken(relationship.messageSort)} ${targetName}${label}`;
}

function printCombinedFragment(
  fragment: CombinedFragmentElement,
  model: UmlModel,
  nameById: ReadonlyMap<string, string>,
  printedMessageIds: Set<string>,
): string[] {
  const lines: string[] = [`${fragment.operator} {`];

  for (const operand of fragment.operands) {
    if (operand.guard !== undefined) {
      lines.push(`  [${operand.guard}]`);
    }
    for (const messageId of operand.messageIds) {
      const relationship = model.relationships.find((item) => item.id === messageId);
      if (relationship !== undefined && isMessageRelationship(relationship)) {
        lines.push(`  ${printMessage(relationship, nameById)}`);
        printedMessageIds.add(messageId);
      }
    }
  }

  lines.push("}");
  return lines;
}

export function printSequence(model: UmlModel, options?: { name?: string }): string {
  const lines: string[] = ["diagram sequence"];
  if (options?.name !== undefined) {
    lines[0] = `diagram sequence ${options.name}`;
  }

  const lifelines = model.elements.filter(isPrintableLifeline);
  for (const lifeline of lifelines) {
    lines.push("");
    lines.push(printLifeline(lifeline));
  }

  const nameById = new Map(model.elements.map((element) => [element.id, element.name]));
  const printedMessageIds = new Set<string>();
  const fragments = model.elements.filter(isCombinedFragment);

  if (fragments.length > 0 || model.relationships.some(isMessageRelationship)) {
    lines.push("");
  }

  for (const fragment of fragments) {
    lines.push(...printCombinedFragment(fragment, model, nameById, printedMessageIds));
    lines.push("");
  }

  for (const relationship of model.relationships) {
    if (!isMessageRelationship(relationship) || printedMessageIds.has(relationship.id)) {
      continue;
    }
    lines.push(printMessage(relationship, nameById));
  }

  return `${lines.join("\n").trimEnd()}\n`;
}

export function structuralSequenceModel(model: UmlModel) {
  const nameById = new Map(model.elements.map((element) => [element.id, element.name]));

  return {
    kind: model.kind,
    lifelines: model.elements
      .filter(isPrintableLifeline)
      .map((lifeline) => ({
        name: lifeline.name,
        classifierName: lifeline.classifierName,
      })),
    combinedFragments: model.elements.flatMap((element) => {
      if (!isCombinedFragment(element)) {
        return [];
      }
      return [
        {
          operator: element.operator,
          operands: element.operands.map((operand) => ({
            guard: operand.guard,
            messages: operand.messageIds.map((messageId) => {
              const relationship = model.relationships.find((item) => item.id === messageId);
              if (relationship === undefined || !isMessageRelationship(relationship)) {
                throw new Error("Combined fragment operand must reference a message");
              }
              return {
                sourceName: nameById.get(relationship.sourceId),
                targetName: nameById.get(relationship.targetId),
                messageSort: relationship.messageSort,
                name: relationship.name,
              };
            }),
          })),
        },
      ];
    }),
    messages: model.relationships.flatMap((relationship) => {
      if (!isMessageRelationship(relationship)) {
        return [];
      }
      return [
        {
          sourceName: nameById.get(relationship.sourceId),
          targetName: nameById.get(relationship.targetId),
          messageSort: relationship.messageSort,
          name: relationship.name,
        },
      ];
    }),
    executionSpecs: model.elements.flatMap((element) => {
      if (element.elementType !== "executionSpecification") {
        return [];
      }
      return [
        {
          parentName: element.parentId
            ? nameById.get(element.parentId)
            : undefined,
          startMessageId: element.startMessageId,
          finishMessageId: element.finishMessageId,
        },
      ];
    }),
    hasIllegalClassifiers: model.elements.some(isClassifierElement),
  };
}

export type StructuralSequenceModel = ReturnType<typeof structuralSequenceModel>;
