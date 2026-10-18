import { assertNever, createId, type Diagnostic, type DslSpan } from "@graphiq/uml-core";
import {
  SEQUENCE_MARKUP_RULE_ID,
  type SequenceMarkupDocument,
  type SequenceMarkupItem,
  type SequenceMarkupMessageSort,
  type SequenceMarkupParticipant,
  type SequenceMarkupParticipantKind,
} from "@graphiq/uml-dsl";
import {
  emptyModel,
  type CombinedFragmentElement,
  type CombinedFragmentOperand,
  type ExecutionSpecificationElement,
  type LifelineElement,
  type LifelineHead,
  type MessageRelationship,
  type UmlElement,
  type UmlModel,
} from "@graphiq/uml-model";
import { createBuildContext, type CompilationSourceMap } from "./identity.js";
import { synthesizeSequenceExecutionSpecs } from "./sequenceAstToModel.js";

type OpenActivation = {
  id: string;
  startMessageId?: string;
};

export function sequenceMarkupToModel(
  document: SequenceMarkupDocument,
  previous?: UmlModel,
  seedDiagnostics: readonly Diagnostic[] = [],
): { model: UmlModel; diagnostics: Diagnostic[]; sourceMap: CompilationSourceMap } {
  const identity = createBuildContext(previous).identity;
  const diagnostics = [...seedDiagnostics];
  const lifelines: LifelineElement[] = [];
  const fragments: CombinedFragmentElement[] = [];
  const notes: UmlElement[] = [];
  const relationships: MessageRelationship[] = [];
  const specs: ExecutionSpecificationElement[] = [];
  const keys = new Map<string, string>();
  const openByLifeline = new Map<string, OpenActivation[]>();
  const pending: OpenActivation[] = [];
  const lastTouch = new Map<string, MessageRelationship>();
  const openSynch: { sourceId: string; targetId: string }[] = [];
  const operandStack: { fragment: CombinedFragmentElement; operandIndex: number }[] = [];
  let interactionIndex = 0;

  const nextIndex = (): number => {
    const current = interactionIndex;
    interactionIndex += 1;
    return current;
  };

  const warn = (message: string, span?: DslSpan) => {
    diagnostics.push({
      id: createId(),
      ruleId: SEQUENCE_MARKUP_RULE_ID,
      severity: "warning",
      message,
      elementIds: [],
      ...(span !== undefined ? { dslSpan: span } : {}),
    });
  };

  const declare = (participant: SequenceMarkupParticipant): string => {
    const existing =
      keys.get(participant.displayName) ??
      (participant.alias !== undefined ? keys.get(participant.alias) : undefined);
    if (existing !== undefined && keys.get(participant.displayName) === existing) {
      warn(`Participant "${participant.displayName}" is already declared.`, participant.span);
      return existing;
    }
    const claim = identity.allocateElement({
      elementType: "lifeline",
      name: participant.displayName,
      span: participant.span,
    });
    const appearance = lifelineAppearance(participant.kind);
    const element: LifelineElement = {
      id: claim.id,
      elementType: "lifeline",
      name: participant.displayName,
      ...appearance,
    };
    lifelines.push(element);
    keys.set(participant.displayName, claim.id);
    if (participant.alias !== undefined) {
      const taken = keys.get(participant.alias);
      if (taken !== undefined && taken !== claim.id) {
        warn(`Alias "${participant.alias}" is already used.`, participant.span);
      } else {
        keys.set(participant.alias, claim.id);
      }
    }
    return claim.id;
  };

  const resolve = (token: string, span?: DslSpan): string => {
    const existing = keys.get(token);
    if (existing !== undefined) {
      return existing;
    }
    return declare({
      kind: "participant",
      displayName: token,
      span: span ?? { start: 0, end: 0 },
    });
  };

  const activate = (lifelineId: string, messageId: string | undefined, span?: DslSpan) => {
    const lifeline = lifelines.find((item) => item.id === lifelineId);
    const claim = identity.allocateElement({
      elementType: "executionSpecification",
      name: `activation-${lifeline?.name ?? "lifeline"}`,
      parentId: lifelineId,
      anonymous: true,
      span,
    });
    const spec: ExecutionSpecificationElement = {
      id: claim.id,
      elementType: "executionSpecification",
      name: `activation-${lifeline?.name ?? "lifeline"}`,
      parentId: lifelineId,
      ...(messageId !== undefined ? { startMessageId: messageId } : {}),
    };
    specs.push(spec);
    const open = { id: claim.id, ...(messageId !== undefined ? { startMessageId: messageId } : {}) };
    if (messageId === undefined) {
      pending.push(open);
      return;
    }
    const stack = openByLifeline.get(lifelineId) ?? [];
    stack.push(open);
    openByLifeline.set(lifelineId, stack);
  };

  const deactivate = (lifelineId: string, messageId: string | undefined, span?: DslSpan) => {
    const stack = openByLifeline.get(lifelineId);
    const current = stack?.pop();
    if (current === undefined) {
      warn("deactivate has no matching activate.", span);
      return;
    }
    const spec = specs.find((item) => item.id === current.id);
    if (spec !== undefined && messageId !== undefined) {
      spec.finishMessageId = messageId;
    }
  };

  const addMessageToOpenOperands = (messageId: string) => {
    for (const frame of operandStack) {
      const operand = frame.fragment.operands[frame.operandIndex];
      if (operand !== undefined) {
        operand.messageIds.push(messageId);
      }
    }
  };

  const classifySort = (
    sort: SequenceMarkupMessageSort,
    sourceId: string,
    targetId: string,
  ): MessageRelationship["messageSort"] => {
    if (sort === "synchCall") {
      openSynch.push({ sourceId, targetId });
      return "synchCall";
    }
    if (sort === "asynchCall") {
      return "asynchCall";
    }
    const matchIndex = openSynch.findIndex(
      (call) => call.sourceId === targetId && call.targetId === sourceId,
    );
    if (matchIndex === -1) {
      return "asynchSignal";
    }
    openSynch.splice(matchIndex, 1);
    return "reply";
  };

  const walk = (items: readonly SequenceMarkupItem[]) => {
    let previousMessage: MessageRelationship | undefined;
    for (const item of items) {
      switch (item.itemKind) {
        case "message": {
          const sourceId = resolve(item.source, item.span);
          const targetId = resolve(item.target, item.span);
          const messageSort = classifySort(item.messageSort, sourceId, targetId);
          const claim = identity.allocateRelationship({
            sourceId,
            targetId,
            relationshipType: "message",
            name: item.label,
            discriminator: messageSort,
            span: item.span,
          });
          const relationship: MessageRelationship = {
            id: claim.id,
            relationshipType: "message",
            sourceId,
            targetId,
            messageSort,
            ...(item.label !== undefined ? { name: item.label } : {}),
            interactionIndex: nextIndex(),
          };
          relationships.push(relationship);
          lastTouch.set(sourceId, relationship);
          lastTouch.set(targetId, relationship);
          addMessageToOpenOperands(claim.id);
          const stillWaiting: OpenActivation[] = [];
          for (const waiting of pending.splice(0, pending.length)) {
            const spec = specs.find((entry) => entry.id === waiting.id);
            if (spec?.parentId !== sourceId && spec?.parentId !== targetId) {
              stillWaiting.push(waiting);
              continue;
            }
            if (spec !== undefined) {
              spec.startMessageId = claim.id;
              const stack = openByLifeline.get(spec.parentId) ?? [];
              stack.push({ id: spec.id, startMessageId: claim.id });
              openByLifeline.set(spec.parentId, stack);
            }
          }
          pending.push(...stillWaiting);
          for (const marker of item.activations) {
            const lifelineId = resolve(marker.participant, item.span);
            if (marker.action === "activate") {
              activate(lifelineId, claim.id, item.span);
            } else {
              deactivate(lifelineId, claim.id, item.span);
            }
          }
          previousMessage = relationship;
          break;
        }
        case "activate": {
          const lifelineId = resolve(item.participant, item.span);
          if (
            previousMessage !== undefined &&
            (previousMessage.sourceId === lifelineId || previousMessage.targetId === lifelineId)
          ) {
            activate(lifelineId, previousMessage.id, item.span);
          } else {
            activate(lifelineId, undefined, item.span);
          }
          break;
        }
        case "deactivate": {
          const lifelineId = resolve(item.participant, item.span);
          deactivate(lifelineId, lastTouch.get(lifelineId)?.id, item.span);
          break;
        }
        case "note": {
          const lifelineIds = item.participants.map((participant) => resolve(participant, item.span));
          const claim = identity.allocateElement({
            elementType: "note",
            name: item.text,
            anonymous: true,
            span: item.span,
          });
          const host = operandStack[operandStack.length - 1];
          previousMessage = undefined;
          notes.push({
            id: claim.id,
            elementType: "note",
            name: item.text,
            interactionIndex: nextIndex(),
            notePlacement: item.placement,
            noteLifelineIds: lifelineIds,
            ...(host !== undefined
              ? {
                  noteHostFragmentId: host.fragment.id,
                  noteHostOperandIndex: host.operandIndex,
                }
              : {}),
          });
          break;
        }
        case "group": {
          const operands: CombinedFragmentOperand[] = item.operands.map((operand) => ({
            ...(operand.guard !== undefined ? { guard: operand.guard } : {}),
            messageIds: [],
          }));
          const host = operandStack[operandStack.length - 1];
          const claim = identity.allocateElement({
            elementType: "combinedFragment",
            name: item.operator,
            anonymous: true,
            span: item.span,
            ...(host !== undefined ? { parentId: host.fragment.id } : {}),
          });
          const fragment: CombinedFragmentElement = {
            id: claim.id,
            elementType: "combinedFragment",
            name: item.operator,
            operator: item.operator,
            operands,
            interactionIndex: nextIndex(),
            ...(host !== undefined
              ? { parentId: host.fragment.id, hostOperandIndex: host.operandIndex }
              : {}),
          };
          fragments.push(fragment);
          previousMessage = undefined;
          item.operands.forEach((operand, operandIndex) => {
            operandStack.push({ fragment, operandIndex });
            walk(operand.items);
            operandStack.pop();
          });
          break;
        }
        default:
          assertNever(item);
      }
    }
  };

  for (const participant of document.participants) {
    declare(participant);
  }
  walk(document.items);

  if (pending.length > 0) {
    warn("activate has no following message.");
  }

  const explicitLifelines = new Set(
    specs.flatMap((spec) => (spec.parentId !== undefined ? [spec.parentId] : [])),
  );
  const base: UmlModel = {
    ...emptyModel("sequence"),
    id: previous?.id ?? emptyModel("sequence").id,
    elements: [...lifelines, ...fragments, ...notes, ...specs],
    relationships,
  };
  const model =
    explicitLifelines.size === 0
      ? synthesizeSequenceExecutionSpecs(base, previous)
      : withSelectiveSpecs(base, explicitLifelines, previous);

  return {
    model,
    diagnostics: [...diagnostics, ...identity.diagnostics],
    sourceMap: identity.sourceMap,
  };
}

function withSelectiveSpecs(
  model: UmlModel,
  explicitLifelines: ReadonlySet<string>,
  previous: UmlModel | undefined,
): UmlModel {
  const withoutSpecs = model.elements.filter(
    (element) => element.elementType !== "executionSpecification",
  );
  const synthesized = synthesizeSequenceExecutionSpecs(
    { ...model, elements: withoutSpecs },
    previous,
  );
  const extra = synthesized.elements.filter(
    (element) =>
      element.elementType === "executionSpecification" &&
      (element.parentId === undefined || !explicitLifelines.has(element.parentId)),
  );
  return {
    ...model,
    elements: [...model.elements, ...extra],
  };
}

function lifelineAppearance(
  kind: SequenceMarkupParticipantKind,
): { head?: LifelineHead; stereotype?: string } {
  switch (kind) {
    case "actor":
      return { head: "actor" };
    case "participant":
      return {};
    case "boundary":
    case "control":
    case "entity":
    case "database":
    case "collections":
    case "queue":
      return { stereotype: kind };
    default:
      return assertNever(kind);
  }
}
