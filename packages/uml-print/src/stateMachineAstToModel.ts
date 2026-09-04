import { assertNever, createId } from "@graphiq/uml-core";
import type {
  AstPseudostateDeclaration,
  AstPseudostateKind,
  AstStateDeclaration,
  AstStateMachineBodyItem,
  AstStateMachineTransition,
  StateMachineDiagramAst,
} from "@graphiq/uml-dsl";
import {
  emptyModel,
  type ElementType,
  type PseudostateKind,
  type UmlElement,
  type UmlModel,
  type UmlRelationship,
} from "@graphiq/uml-model";

export const IMPLICIT_REGION_NAME = "__region__";

function findPreviousElement(
  previous: UmlModel | undefined,
  name: string,
  elementType: ElementType,
  parentId?: string,
): UmlElement | undefined {
  if (!previous) {
    return undefined;
  }

  return previous.elements.find(
    (element) =>
      element.name === name &&
      element.elementType === elementType &&
      (parentId === undefined ? element.parentId === undefined : element.parentId === parentId),
  );
}

function findPreviousInitial(
  previous: UmlModel | undefined,
  parentId: string | undefined,
): UmlElement | undefined {
  if (!previous) {
    return undefined;
  }

  return previous.elements.find(
    (element) =>
      element.elementType === "pseudostate" &&
      element.kind === "initial" &&
      element.name === "[*]" &&
      (parentId === undefined
        ? element.parentId === undefined
        : element.parentId === parentId),
  );
}

function findPreviousFinal(
  previous: UmlModel | undefined,
  parentId: string | undefined,
): UmlElement | undefined {
  if (!previous) {
    return undefined;
  }

  return previous.elements.find(
    (element) =>
      element.elementType === "finalState" &&
      element.name === "[*]" &&
      (parentId === undefined
        ? element.parentId === undefined
        : element.parentId === parentId),
  );
}

function findPreviousTransition(
  previous: UmlModel | undefined,
  sourceId: string,
  targetId: string,
  trigger?: string,
  guard?: string,
  effect?: string,
): UmlRelationship | undefined {
  if (!previous) {
    return undefined;
  }

  return previous.relationships.find((relationship) => {
    if (
      relationship.relationshipType !== "transition" ||
      relationship.sourceId !== sourceId ||
      relationship.targetId !== targetId
    ) {
      return false;
    }
    return (
      (relationship.trigger ?? undefined) === trigger &&
      (relationship.guard ?? undefined) === guard &&
      (relationship.effect ?? undefined) === effect
    );
  });
}

function preservedNonDslElements(previous: UmlModel | undefined): UmlElement[] {
  if (!previous) {
    return [];
  }

  return previous.elements.filter((element) => element.elementType === "note");
}

function addStateElement(
  model: UmlModel,
  declaration: AstStateDeclaration,
  parentId: string | undefined,
  previous?: UmlModel,
): UmlModel {
  const existing = model.elements.find(
    (element) =>
      element.elementType === "state" &&
      element.name === declaration.name &&
      element.parentId === parentId,
  );

  if (existing !== undefined && existing.elementType === "state") {
    return {
      ...model,
      elements: model.elements.map((element) =>
        element.id === existing.id
          ? {
              ...existing,
              entry: declaration.entry,
              do: declaration.do,
              exit: declaration.exit,
            }
          : element,
      ),
    };
  }

  const previousElement = findPreviousElement(previous, declaration.name, "state", parentId);
  const element: UmlElement = {
    id: previousElement?.id ?? createId(),
    elementType: "state",
    name: declaration.name,
    ...(parentId !== undefined ? { parentId } : {}),
    ...(declaration.entry !== undefined ? { entry: declaration.entry } : {}),
    ...(declaration.do !== undefined ? { do: declaration.do } : {}),
    ...(declaration.exit !== undefined ? { exit: declaration.exit } : {}),
  };

  return {
    ...model,
    elements: [...model.elements, element],
  };
}

function addRegionElement(
  model: UmlModel,
  name: string,
  parentId: string,
  previous?: UmlModel,
): UmlModel {
  const existing = model.elements.find(
    (element) =>
      element.elementType === "region" &&
      element.name === name &&
      element.parentId === parentId,
  );
  if (existing !== undefined) {
    return model;
  }

  const previousElement = findPreviousElement(previous, name, "region", parentId);
  const element: UmlElement = {
    id: previousElement?.id ?? createId(),
    elementType: "region",
    name,
    parentId,
  };

  return {
    ...model,
    elements: [...model.elements, element],
  };
}

function astPseudostateKindToModel(kind: AstPseudostateKind): PseudostateKind {
  switch (kind) {
    case "choice":
      return "choice";
    case "junction":
      return "junction";
    case "fork":
      return "fork";
    case "join":
      return "join";
    case "shallowHistory":
      return "shallowHistory";
    case "deepHistory":
      return "deepHistory";
    case "terminate":
      return "terminate";
    default:
      return assertNever(kind);
  }
}

function addPseudostateElement(
  model: UmlModel,
  declaration: AstPseudostateDeclaration,
  parentId: string | undefined,
  previous?: UmlModel,
): UmlModel {
  const kind = astPseudostateKindToModel(declaration.pseudostateKind);
  const existing = model.elements.find(
    (element) =>
      element.elementType === "pseudostate" &&
      element.name === declaration.name &&
      element.kind === kind &&
      element.parentId === parentId,
  );
  if (existing !== undefined) {
    return model;
  }

  const previousElement = previous?.elements.find(
    (element) =>
      element.elementType === "pseudostate" &&
      element.name === declaration.name &&
      element.kind === kind &&
      element.parentId === parentId,
  );

  const element: UmlElement = {
    id: previousElement?.id ?? createId(),
    elementType: "pseudostate",
    name: declaration.name,
    kind,
    ...(parentId !== undefined ? { parentId } : {}),
  };

  return {
    ...model,
    elements: [...model.elements, element],
  };
}

function bodyNeedsImplicitRegion(items: readonly AstStateMachineBodyItem[]): boolean {
  const hasExplicitRegion = items.some((item) => item.itemKind === "region");
  if (hasExplicitRegion) {
    return false;
  }

  return items.some(
    (item) =>
      item.itemKind === "transition" ||
      item.itemKind === "pseudostate" ||
      item.itemKind === "state",
  );
}

function regionIdForState(
  model: UmlModel,
  stateId: string,
  items: readonly AstStateMachineBodyItem[],
): string | undefined {
  const explicitRegion = items.find((item) => item.itemKind === "region");
  if (explicitRegion?.itemKind === "region") {
    return model.elements.find(
      (element) =>
        element.elementType === "region" &&
        element.name === explicitRegion.region.name &&
        element.parentId === stateId,
    )?.id;
  }

  if (!bodyNeedsImplicitRegion(items)) {
    return undefined;
  }

  return model.elements.find(
    (element) =>
      element.elementType === "region" &&
      element.name === IMPLICIT_REGION_NAME &&
      element.parentId === stateId,
  )?.id;
}

function ensureNamedState(
  model: UmlModel,
  name: string,
  parentId: string | undefined,
  previous?: UmlModel,
): UmlModel {
  if (
    model.elements.some(
      (element) => element.name === name && element.parentId === parentId,
    )
  ) {
    return model;
  }

  const previousElement = findPreviousElement(previous, name, "state", parentId);
  const element: UmlElement = {
    id: previousElement?.id ?? createId(),
    elementType: "state",
    name,
    ...(parentId !== undefined ? { parentId } : {}),
  };

  return {
    ...model,
    elements: [...model.elements, element],
  };
}

function ensureStarEndpoint(
  model: UmlModel,
  transition: AstStateMachineTransition,
  role: "source" | "target",
  parentId: string | undefined,
  previous?: UmlModel,
): UmlModel {
  const isStar = role === "source" ? transition.sourceIsStar : transition.targetIsStar;
  if (!isStar) {
    const name = role === "source" ? transition.sourceName : transition.targetName;
    return ensureNamedState(model, name, parentId, previous);
  }

  if (role === "source") {
    const existing = model.elements.find(
      (element) =>
        element.elementType === "pseudostate" &&
        element.kind === "initial" &&
        element.name === "[*]" &&
        element.parentId === parentId,
    );
    if (existing !== undefined) {
      return model;
    }

    const previousElement = findPreviousInitial(previous, parentId);
    const element: UmlElement = {
      id: previousElement?.id ?? createId(),
      elementType: "pseudostate",
      name: "[*]",
      kind: "initial",
      ...(parentId !== undefined ? { parentId } : {}),
    };
    return {
      ...model,
      elements: [...model.elements, element],
    };
  }

  const existing = model.elements.find(
    (element) =>
      element.elementType === "finalState" &&
      element.name === "[*]" &&
      element.parentId === parentId,
  );
  if (existing !== undefined) {
    return model;
  }

  const previousElement = findPreviousFinal(previous, parentId);
  const element: UmlElement = {
    id: previousElement?.id ?? createId(),
    elementType: "finalState",
    name: "[*]",
    ...(parentId !== undefined ? { parentId } : {}),
  };
  return {
    ...model,
    elements: [...model.elements, element],
  };
}

function elementForEndpoint(
  model: UmlModel,
  transition: AstStateMachineTransition,
  role: "source" | "target",
  parentId: string | undefined,
): UmlElement | undefined {
  const isStar = role === "source" ? transition.sourceIsStar : transition.targetIsStar;
  if (isStar) {
    if (role === "source") {
      return model.elements.find(
        (element) =>
          element.elementType === "pseudostate" &&
          element.kind === "initial" &&
          element.name === "[*]" &&
          element.parentId === parentId,
      );
    }
    return model.elements.find(
      (element) =>
        element.elementType === "finalState" &&
        element.name === "[*]" &&
        element.parentId === parentId,
    );
  }

  const name = role === "source" ? transition.sourceName : transition.targetName;
  return model.elements.find(
    (element) => element.elementType === "state" && element.name === name && element.parentId === parentId,
  );
}

function addTransition(
  model: UmlModel,
  transition: AstStateMachineTransition,
  parentId: string | undefined,
  previous?: UmlModel,
): UmlModel {
  let nextModel = ensureStarEndpoint(model, transition, "source", parentId, previous);
  nextModel = ensureStarEndpoint(nextModel, transition, "target", parentId, previous);

  const source = elementForEndpoint(nextModel, transition, "source", parentId);
  const target = elementForEndpoint(nextModel, transition, "target", parentId);
  if (source === undefined || target === undefined) {
    return nextModel;
  }

  const previousRelationship = findPreviousTransition(
    previous,
    source.id,
    target.id,
    transition.trigger,
    transition.guard,
    transition.effect,
  );

  const nextRelationship: UmlRelationship = {
    id: previousRelationship?.id ?? createId(),
    relationshipType: "transition",
    sourceId: source.id,
    targetId: target.id,
    ...(transition.trigger !== undefined ? { trigger: transition.trigger } : {}),
    ...(transition.guard !== undefined ? { guard: transition.guard } : {}),
    ...(transition.effect !== undefined ? { effect: transition.effect } : {}),
  };

  return {
    ...nextModel,
    relationships: [...nextModel.relationships, nextRelationship],
  };
}

function addBodyItems(
  model: UmlModel,
  items: readonly AstStateMachineBodyItem[],
  stateId: string,
  previous?: UmlModel,
): UmlModel {
  let nextModel = model;

  if (bodyNeedsImplicitRegion(items)) {
    nextModel = addRegionElement(nextModel, IMPLICIT_REGION_NAME, stateId, previous);
  }

  for (const item of items) {
    switch (item.itemKind) {
      case "region": {
        nextModel = addRegionElement(nextModel, item.region.name, stateId, previous);
        const regionId = nextModel.elements.find(
          (element) =>
            element.elementType === "region" &&
            element.name === item.region.name &&
            element.parentId === stateId,
        )?.id;
        if (regionId !== undefined) {
          nextModel = addRegionBodyItems(nextModel, item.region.items, regionId, previous);
        }
        break;
      }
      case "state":
        nextModel = addStateElement(nextModel, item.state, stateId, previous);
        {
          const nestedStateId = nextModel.elements.find(
            (element) =>
              element.elementType === "state" &&
              element.name === item.state.name &&
              element.parentId === stateId,
          )?.id;
          if (nestedStateId !== undefined && item.state.items.length > 0) {
            nextModel = addBodyItems(nextModel, item.state.items, nestedStateId, previous);
          }
        }
        break;
      case "pseudostate": {
        const regionId = regionIdForState(nextModel, stateId, items);
        nextModel = addPseudostateElement(nextModel, item.pseudostate, regionId, previous);
        break;
      }
      case "transition": {
        const regionId = regionIdForState(nextModel, stateId, items);
        nextModel = addTransition(nextModel, item.transition, regionId, previous);
        break;
      }
      default: {
        const unreachable: never = item;
        throw new Error(`Unhandled state machine body item: ${String(unreachable)}`);
      }
    }
  }

  return nextModel;
}

function addRegionBodyItems(
  model: UmlModel,
  items: readonly AstStateMachineBodyItem[],
  regionId: string,
  previous?: UmlModel,
): UmlModel {
  let nextModel = model;

  for (const item of items) {
    switch (item.itemKind) {
      case "state":
        nextModel = addStateElement(nextModel, item.state, regionId, previous);
        {
          const nestedStateId = nextModel.elements.find(
            (element) =>
              element.elementType === "state" &&
              element.name === item.state.name &&
              element.parentId === regionId,
          )?.id;
          if (nestedStateId !== undefined && item.state.items.length > 0) {
            nextModel = addBodyItems(nextModel, item.state.items, nestedStateId, previous);
          }
        }
        break;
      case "pseudostate":
        nextModel = addPseudostateElement(nextModel, item.pseudostate, regionId, previous);
        break;
      case "transition":
        nextModel = addTransition(nextModel, item.transition, regionId, previous);
        break;
      case "region":
        throw new Error("Nested regions inside a region are not supported in v1");
      default: {
        const unreachable: never = item;
        throw new Error(`Unhandled region body item: ${String(unreachable)}`);
      }
    }
  }

  return nextModel;
}

export function stateMachineAstToModel(
  ast: StateMachineDiagramAst,
  previous?: UmlModel,
): UmlModel {
  const base = previous ?? emptyModel("stateMachine");
  let model: UmlModel = {
    id: base.id,
    kind: "stateMachine",
    elements: preservedNonDslElements(previous),
    relationships: [],
  };

  for (const item of ast.items) {
    switch (item.itemKind) {
      case "state":
        model = addStateElement(model, item.state, undefined, previous);
        {
          const stateId = model.elements.find(
            (element) =>
              element.elementType === "state" &&
              element.name === item.state.name &&
              element.parentId === undefined,
          )?.id;
          if (stateId !== undefined && item.state.items.length > 0) {
            model = addBodyItems(model, item.state.items, stateId, previous);
          }
        }
        break;
      case "pseudostate":
        model = addPseudostateElement(model, item.pseudostate, undefined, previous);
        break;
      case "transition":
        model = addTransition(model, item.transition, undefined, previous);
        break;
      case "region":
        throw new Error("Top-level region declarations are not supported without a parent state");
      default: {
        const unreachable: never = item;
        throw new Error(`Unhandled top-level state machine item: ${String(unreachable)}`);
      }
    }
  }

  for (const transition of ast.transitions) {
    model = addTransition(model, transition, undefined, previous);
  }

  return model;
}
