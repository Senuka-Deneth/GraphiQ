import { assertNever } from "@graphiq/uml-core";
import {
  isTransitionRelationship,
  type UmlElement,
  type UmlModel,
  type UmlRelationship,
} from "@graphiq/uml-model";
import { IMPLICIT_REGION_NAME } from "./stateMachineAstToModel.js";

function printEndpoint(element: UmlElement): string {
  if (element.elementType === "pseudostate" && element.kind === "initial") {
    return "[*]";
  }
  if (element.elementType === "finalState") {
    return "[*]";
  }
  return element.name;
}

function printTransitionLabel(relationship: UmlRelationship): string {
  if (!isTransitionRelationship(relationship)) {
    return "";
  }

  const parts: string[] = [];
  if (relationship.trigger !== undefined && relationship.trigger.length > 0) {
    parts.push(relationship.trigger);
  }
  if (relationship.guard !== undefined && relationship.guard.length > 0) {
    parts.push(`[${relationship.guard}]`);
  }
  if (relationship.effect !== undefined && relationship.effect.length > 0) {
    parts.push(`/ ${relationship.effect}`);
  }

  if (parts.length === 0) {
    return "";
  }

  return ` : ${parts.join(" ")}`;
}

function printTransition(
  relationship: UmlRelationship,
  elementById: ReadonlyMap<string, UmlElement>,
): string {
  const source = elementById.get(relationship.sourceId);
  const target = elementById.get(relationship.targetId);
  if (source === undefined || target === undefined) {
    throw new Error("Transition endpoints must reference printable elements");
  }

  return `${printEndpoint(source)} --> ${printEndpoint(target)}${printTransitionLabel(relationship)}`;
}

function pseudostateKeyword(element: UmlElement): string | undefined {
  if (element.elementType !== "pseudostate") {
    return undefined;
  }

  switch (element.kind) {
    case "choice":
      return "choice";
    case "junction":
      return "junction";
    case "fork":
      return "fork";
    case "join":
      return "join";
    case "shallowHistory":
      return "history";
    case "deepHistory":
      return "deepHistory";
    case "terminate":
      return "terminate";
    case "initial":
    case "entryPoint":
    case "exitPoint":
      return undefined;
    default:
      return assertNever(element.kind);
  }
}

function shouldPrintStateDeclaration(model: UmlModel, state: UmlElement): boolean {
  if (state.elementType !== "state") {
    return false;
  }
  if (state.entry !== undefined || state.do !== undefined || state.exit !== undefined) {
    return true;
  }
  return stateHasPrintableBody(model, state.id);
}

function stateHasPrintableBody(model: UmlModel, stateId: string): boolean {
  const children = model.elements.filter((element) => element.parentId === stateId);
  if (children.length === 0) {
    return false;
  }

  const state = model.elements.find((element) => element.id === stateId);
  if (state?.elementType === "state") {
    if (state.entry !== undefined || state.do !== undefined || state.exit !== undefined) {
      return true;
    }
  }

  return children.some(
    (child) =>
      child.elementType === "region" ||
      child.elementType === "pseudostate" ||
      child.elementType === "state" ||
      model.relationships.some(
        (relationship) =>
          isTransitionRelationship(relationship) &&
          (relationship.sourceId === child.id || relationship.targetId === child.id),
      ),
  );
}

function transitionsForScope(model: UmlModel, scopeIds: ReadonlySet<string>): UmlRelationship[] {
  return model.relationships.filter(
    (relationship) =>
      isTransitionRelationship(relationship) &&
      scopeIds.has(relationship.sourceId) &&
      scopeIds.has(relationship.targetId),
  );
}

function collectScopeIds(model: UmlModel, rootId: string): Set<string> {
  const ids = new Set<string>();
  const queue = [rootId];

  while (queue.length > 0) {
    const current = queue.shift();
    if (current === undefined || ids.has(current)) {
      continue;
    }
    ids.add(current);

    for (const child of model.elements.filter((element) => element.parentId === current)) {
      if (child.elementType === "region" && child.name === IMPLICIT_REGION_NAME) {
        queue.push(child.id);
        continue;
      }
      if (child.elementType === "region" || child.elementType === "state") {
        queue.push(child.id);
      } else {
        ids.add(child.id);
      }
    }
  }

  return ids;
}

function printRegionBody(model: UmlModel, regionId: string, indent: string): string[] {
  const lines: string[] = [];
  const children = model.elements.filter((element) => element.parentId === regionId);

  for (const child of children) {
    if (child.elementType === "state") {
      lines.push(...printStateBlock(model, child, indent));
      continue;
    }
    if (child.elementType === "pseudostate") {
      const keyword = pseudostateKeyword(child);
      if (keyword !== undefined) {
        const defaultName = keyword;
        lines.push(
          child.name === defaultName ? `${indent}${keyword}` : `${indent}${keyword} ${child.name}`,
        );
      }
    }
  }

  const scopeIds = collectScopeIds(model, regionId);
  for (const transition of transitionsForScope(model, scopeIds)) {
    lines.push(
      `${indent}${printTransition(transition, new Map(model.elements.map((element) => [element.id, element])))}`,
    );
  }

  return lines;
}

function printStateBlock(model: UmlModel, state: UmlElement, indent: string): string[] {
  if (state.elementType !== "state") {
    return [];
  }

  if (!stateHasPrintableBody(model, state.id)) {
    return [`${indent}state ${state.name}`];
  }

  const lines = [`${indent}state ${state.name} {`];
  if (state.entry !== undefined) {
    lines.push(`${indent}  entry / ${state.entry}`);
  }
  if (state.do !== undefined) {
    lines.push(`${indent}  do / ${state.do}`);
  }
  if (state.exit !== undefined) {
    lines.push(`${indent}  exit / ${state.exit}`);
  }

  const children = model.elements.filter((element) => element.parentId === state.id);
  for (const child of children) {
    if (child.elementType === "region") {
      if (child.name === IMPLICIT_REGION_NAME) {
        lines.push(...printRegionBody(model, child.id, `${indent}  `));
      } else {
        lines.push(`${indent}  region ${child.name} {`);
        lines.push(...printRegionBody(model, child.id, `${indent}    `));
        lines.push(`${indent}  }`);
      }
      continue;
    }
    if (child.elementType === "pseudostate") {
      const keyword = pseudostateKeyword(child);
      if (keyword !== undefined) {
        const defaultName = keyword;
        lines.push(
          child.name === defaultName
            ? `${indent}  ${keyword}`
            : `${indent}  ${keyword} ${child.name}`,
        );
      }
    }
  }

  lines.push(`${indent}}`);
  return lines;
}

export function printStateMachine(model: UmlModel, options?: { name?: string }): string {
  const lines: string[] = ["diagram stateMachine"];
  if (options?.name !== undefined) {
    lines[0] = `diagram stateMachine ${options.name}`;
  }

  const elementById = new Map(model.elements.map((element) => [element.id, element]));

  const topLevelStates = model.elements.filter(
    (element) =>
      element.elementType === "state" &&
      element.parentId === undefined &&
      shouldPrintStateDeclaration(model, element),
  );
  for (const state of topLevelStates) {
    lines.push("");
    lines.push(...printStateBlock(model, state, ""));
  }

  const topLevelPseudostates = model.elements.filter((element) => {
    if (element.parentId !== undefined || element.elementType !== "pseudostate") {
      return false;
    }
    return pseudostateKeyword(element) !== undefined;
  });
  for (const pseudostate of topLevelPseudostates) {
    const keyword = pseudostateKeyword(pseudostate);
    if (keyword === undefined) {
      continue;
    }
    lines.push(
      pseudostate.name === keyword ? keyword : `${keyword} ${pseudostate.name}`,
    );
  }

  const topLevelIds = new Set(
    model.elements
      .filter((element) => element.parentId === undefined)
      .map((element) => element.id),
  );
  const topLevelTransitions = model.relationships.filter(
    (relationship) =>
      isTransitionRelationship(relationship) &&
      topLevelIds.has(relationship.sourceId) &&
      topLevelIds.has(relationship.targetId),
  );

  if (topLevelTransitions.length > 0) {
    lines.push("");
    for (const transition of topLevelTransitions) {
      lines.push(printTransition(transition, elementById));
    }
  }

  return `${lines.join("\n")}\n`;
}

export function structuralStateMachineModel(model: UmlModel) {
  const nameById = new Map(model.elements.map((element) => [element.id, element.name]));

  return {
    kind: model.kind,
    elements: model.elements
      .filter((element) => element.elementType !== "note")
      .map((element) => ({
        name: element.name,
        elementType: element.elementType,
        kind: element.elementType === "pseudostate" ? element.kind : undefined,
        parentName:
          element.parentId !== undefined ? nameById.get(element.parentId) : undefined,
        entry: element.elementType === "state" ? element.entry : undefined,
        do: element.elementType === "state" ? element.do : undefined,
        exit: element.elementType === "state" ? element.exit : undefined,
      })),
    transitions: model.relationships.flatMap((relationship) => {
      if (!isTransitionRelationship(relationship)) {
        return [];
      }
      return [
        {
          sourceName: nameById.get(relationship.sourceId),
          targetName: nameById.get(relationship.targetId),
          trigger: relationship.trigger,
          guard: relationship.guard,
          effect: relationship.effect,
        },
      ];
    }),
  };
}

export type StructuralStateMachineModel = ReturnType<typeof structuralStateMachineModel>;
