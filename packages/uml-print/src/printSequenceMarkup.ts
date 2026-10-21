import { assertNever } from "@graphiq/uml-core";
import type {
  CombinedFragmentElement,
  LifelineElement,
  MessageRelationship,
  MessageSort,
  UmlElement,
  UmlModel,
} from "@graphiq/uml-model";

type PrintItem =
  | { index: number; kind: "message"; relationship: MessageRelationship }
  | { index: number; kind: "note"; element: UmlElement }
  | { index: number; kind: "fragment"; element: CombinedFragmentElement };

export function printSequenceMarkup(model: UmlModel, options?: { name?: string }): string {
  const lines = ["@startuml"];
  if (options?.name !== undefined && options.name.trim().length > 0) {
    lines.push(`title ${options.name.trim()}`);
  }
  lines.push("");

  const lifelines = model.elements.filter(isLifeline);
  for (const lifeline of lifelines) {
    lines.push(printLifeline(lifeline));
  }
  if (lifelines.length > 0) {
    lines.push("");
  }

  lines.push(...printBody(rootItems(model), model, 0));
  lines.push("@enduml");
  return `${lines.filter((line, index, all) => line.length > 0 || all[index - 1] !== "").join("\n").trimEnd()}\n`;
}

function printLifeline(lifeline: LifelineElement): string {
  return `${lifelineKeyword(lifeline)} ${formatMarkupName(lifeline.name)}`;
}

function lifelineKeyword(lifeline: LifelineElement): string {
  if (lifeline.head === "actor") {
    return "actor";
  }
  if (lifeline.stereotype !== undefined && lifeline.stereotype.length > 0) {
    return lifeline.stereotype;
  }
  return "participant";
}

export function formatMarkupName(name: string): string {
  if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
    return name;
  }
  return `"${name.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function printBody(items: readonly PrintItem[], model: UmlModel, depth: number): string[] {
  const lines: string[] = [];
  for (const item of items) {
    switch (item.kind) {
      case "message":
        lines.push(indent(depth, printMessage(item.relationship, model)));
        lines.push(...printActivations(model, item.relationship.id, depth));
        break;
      case "note":
        lines.push(...printNote(item.element, model, depth));
        break;
      case "fragment":
        lines.push(...printFragment(item.element, model, depth));
        break;
      default:
        assertNever(item);
    }
  }
  return lines;
}

function printFragment(
  fragment: CombinedFragmentElement,
  model: UmlModel,
  depth: number,
): string[] {
  const lines: string[] = [];
  fragment.operands.forEach((operand, index) => {
    const guard = operand.guard !== undefined && operand.guard.length > 0 ? ` ${operand.guard}` : "";
    lines.push(indent(depth, index === 0 ? `${fragment.operator}${guard}` : `else${guard}`));
    lines.push(...printBody(operandItems(fragment, index, model), model, depth + 1));
  });
  lines.push(indent(depth, "end"));
  return lines;
}

function printNote(element: UmlElement, model: UmlModel, depth: number): string[] {
  const placement = element.notePlacement ?? "over";
  const names = (element.noteLifelineIds ?? [])
    .map((id) => {
      const lifeline = model.elements.find((item) => item.id === id);
      return lifeline !== undefined ? formatMarkupName(lifeline.name) : undefined;
    })
    .filter((name): name is string => name !== undefined)
    .join(", ");
  const of = placement === "over" ? "" : " of";
  const header = `note ${placement}${of} ${names}`;
  if (!element.name.includes("\n")) {
    return [indent(depth, `${header}: ${element.name}`)];
  }
  return [
    indent(depth, header),
    ...element.name.split("\n").map((line) => indent(depth + 1, line)),
    indent(depth, "end note"),
  ];
}

function printActivations(model: UmlModel, messageId: string, depth: number): string[] {
  const specs = model.elements.filter(
    (element) => element.elementType === "executionSpecification",
  );
  const lines: string[] = [];
  for (const spec of specs) {
    if (spec.elementType !== "executionSpecification" || spec.startMessageId !== messageId) {
      continue;
    }
    const name = lifelineName(model, spec.parentId);
    if (name !== undefined) {
      lines.push(indent(depth, `activate ${formatMarkupName(name)}`));
    }
  }
  for (const spec of specs) {
    if (spec.elementType !== "executionSpecification" || spec.finishMessageId !== messageId) {
      continue;
    }
    const name = lifelineName(model, spec.parentId);
    if (name !== undefined) {
      lines.push(indent(depth, `deactivate ${formatMarkupName(name)}`));
    }
  }
  return lines;
}

function printMessage(relationship: MessageRelationship, model: UmlModel): string {
  const source = lifelineName(model, relationship.sourceId) ?? "Unknown";
  const target = lifelineName(model, relationship.targetId) ?? "Unknown";
  const label =
    relationship.name !== undefined && relationship.name.length > 0 ? ` : ${relationship.name}` : "";
  return `${formatMarkupName(source)} ${markupArrow(relationship.messageSort)} ${formatMarkupName(target)}${label}`;
}

function markupArrow(messageSort: MessageSort): string {
  switch (messageSort) {
    case "synchCall":
    case "createMessage":
    case "deleteMessage":
      return "->";
    case "asynchCall":
      return "->>";
    case "asynchSignal":
    case "reply":
      return "-->";
    default:
      return assertNever(messageSort);
  }
}

function rootItems(model: UmlModel): PrintItem[] {
  const fragments = combinedFragments(model);
  const grouped = new Set<string>();
  for (const fragment of fragments) {
    if (isNested(fragment, fragments)) {
      continue;
    }
    for (const messageId of fragmentMessageIds(fragment)) {
      grouped.add(messageId);
    }
  }
  const items: PrintItem[] = [];
  for (const relationship of model.relationships) {
    if (relationship.relationshipType !== "message" || grouped.has(relationship.id)) {
      continue;
    }
    items.push({
      index: relationship.interactionIndex ?? items.length,
      kind: "message",
      relationship,
    });
  }
  for (const fragment of fragments) {
    if (isNested(fragment, fragments)) {
      continue;
    }
    items.push({
      index: fragment.interactionIndex ?? items.length,
      kind: "fragment",
      element: fragment,
    });
  }
  for (const element of model.elements) {
    if (element.elementType !== "note" || isHostedNote(element, fragments)) {
      continue;
    }
    items.push({
      index: element.interactionIndex ?? items.length,
      kind: "note",
      element,
    });
  }
  return items.sort((left, right) => left.index - right.index);
}

function operandItems(
  fragment: CombinedFragmentElement,
  operandIndex: number,
  model: UmlModel,
): PrintItem[] {
  const fragments = combinedFragments(model);
  const operand = fragment.operands[operandIndex];
  const children = fragments.filter(
    (item) => item.parentId === fragment.id && item.hostOperandIndex === operandIndex,
  );
  const covered = new Set(children.flatMap((child) => fragmentMessageIds(child)));
  const items: PrintItem[] = [];
  for (const messageId of operand?.messageIds ?? []) {
    if (covered.has(messageId)) {
      continue;
    }
    const relationship = model.relationships.find((item) => item.id === messageId);
    if (relationship === undefined || relationship.relationshipType !== "message") {
      continue;
    }
    items.push({
      index: relationship.interactionIndex ?? items.length,
      kind: "message",
      relationship,
    });
  }
  for (const child of children) {
    items.push({
      index: child.interactionIndex ?? items.length,
      kind: "fragment",
      element: child,
    });
  }
  for (const element of model.elements) {
    if (
      element.elementType === "note" &&
      element.noteHostFragmentId === fragment.id &&
      element.noteHostOperandIndex === operandIndex
    ) {
      items.push({
        index: element.interactionIndex ?? items.length,
        kind: "note",
        element,
      });
    }
  }
  return items.sort((left, right) => left.index - right.index);
}

function combinedFragments(model: UmlModel): CombinedFragmentElement[] {
  return model.elements.filter(isFragment);
}

function isFragment(element: UmlElement): element is CombinedFragmentElement {
  return element.elementType === "combinedFragment";
}

function isLifeline(element: UmlElement): element is LifelineElement {
  return element.elementType === "lifeline";
}

function isNested(fragment: CombinedFragmentElement, fragments: readonly CombinedFragmentElement[]): boolean {
  return fragment.parentId !== undefined && fragments.some((item) => item.id === fragment.parentId);
}

function isHostedNote(element: UmlElement, fragments: readonly CombinedFragmentElement[]): boolean {
  return (
    element.noteHostFragmentId !== undefined &&
    fragments.some((fragment) => fragment.id === element.noteHostFragmentId)
  );
}

function fragmentMessageIds(fragment: CombinedFragmentElement): string[] {
  return fragment.operands.flatMap((operand) => operand.messageIds);
}

function lifelineName(model: UmlModel, id: string | undefined): string | undefined {
  if (id === undefined) {
    return undefined;
  }
  const element = model.elements.find((item) => item.id === id);
  return element?.name;
}

function indent(depth: number, line: string): string {
  return `${"  ".repeat(depth)}${line}`;
}
