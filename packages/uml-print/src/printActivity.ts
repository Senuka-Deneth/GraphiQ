import { assertNever } from "@graphiq/uml-core";
import { isActivityFlowRelationship, type UmlElement, type UmlModel, type UmlRelationship } from "@graphiq/uml-model";

function needsDeclaration(element: UmlElement): boolean {
  switch (element.elementType) {
    case "note":
      return false;
    case "initialNode":
      return element.name !== "initial";
    case "activityFinalNode":
      return element.name !== "final";
    case "flowFinalNode":
      return element.name !== "flowFinal";
    default:
      return true;
  }
}

function printEndpoint(element: UmlElement): string {
  if (element.elementType === "initialNode" && element.name === "initial") {
    return "initial";
  }
  if (element.elementType === "activityFinalNode" && element.name === "final") {
    return "final";
  }
  if (element.elementType === "flowFinalNode" && element.name === "flowFinal") {
    return "flowFinal";
  }
  return element.name;
}

function printNodeLine(element: UmlElement): string | undefined {
  switch (element.elementType) {
    case "action":
      return `action ${element.name}`;
    case "objectNode":
      return `object ${element.name}`;
    case "decisionNode":
      return element.name === "decision" ? "decision" : `decision ${element.name}`;
    case "mergeNode":
      return element.name === "merge" ? "merge" : `merge ${element.name}`;
    case "forkNode":
      return element.name === "fork" ? "fork" : `fork ${element.name}`;
    case "joinNode":
      return element.name === "join" ? "join" : `join ${element.name}`;
    case "flowFinalNode":
      return element.name === "flowFinal" ? "flowFinal" : `flowFinal ${element.name}`;
    case "initialNode":
      return element.name === "initial" ? undefined : `initial ${element.name}`;
    case "activityFinalNode":
      return element.name === "final" ? undefined : `final ${element.name}`;
    case "activityPartition":
    case "interruptibleActivityRegion":
    case "activity":
    case "note":
    case "constraint":
    case "class":
    case "interface":
    case "dataType":
    case "enumeration":
    case "primitiveType":
    case "associationClass":
    case "instanceSpecification":
    case "package":
    case "part":
    case "port":
    case "collaboration":
    case "collaborationUse":
    case "component":
    case "artifact":
    case "node":
    case "device":
    case "executionEnvironment":
    case "deploymentSpecification":
    case "profile":
    case "stereotype":
    case "metaclass":
    case "actor":
    case "useCase":
    case "subject":
    case "stateMachine":
    case "region":
    case "state":
    case "pseudostate":
    case "finalState":
    case "interaction":
    case "lifeline":
    case "executionSpecification":
    case "combinedFragment":
    case "interactionUse":
    case "gate":
    case "destructionOccurrence":
    case "stateInvariant":
    case "timingState":
    case "durationConstraint":
    case "timeConstraint":
      return undefined;
    default:
      return assertNever(element);
  }
}

function childrenOf(model: UmlModel, parentId: string): UmlElement[] {
  return model.elements.filter((element) => element.parentId === parentId);
}

function printBody(model: UmlModel, parentId: string, indent: string): string[] {
  const lines: string[] = [];

  for (const child of childrenOf(model, parentId)) {
    if (child.elementType === "activityPartition") {
      lines.push(`${indent}partition ${child.name} {`);
      lines.push(...printBody(model, child.id, `${indent}  `));
      lines.push(`${indent}}`);
      continue;
    }
    if (child.elementType === "interruptibleActivityRegion") {
      lines.push(`${indent}interruptible ${child.name} {`);
      lines.push(...printBody(model, child.id, `${indent}  `));
      lines.push(`${indent}}`);
      continue;
    }
    if (!needsDeclaration(child)) {
      continue;
    }
    const line = printNodeLine(child);
    if (line !== undefined) {
      lines.push(`${indent}${line}`);
    }
  }

  return lines;
}

function printFlow(
  relationship: UmlRelationship,
  elementById: ReadonlyMap<string, UmlElement>,
): string {
  const source = elementById.get(relationship.sourceId);
  const target = elementById.get(relationship.targetId);
  if (source === undefined || target === undefined) {
    throw new Error("Flow endpoints must reference printable elements");
  }

  const guard =
    isActivityFlowRelationship(relationship) &&
    relationship.guard !== undefined &&
    relationship.guard.length > 0
      ? ` : [${relationship.guard}]`
      : "";

  return `${printEndpoint(source)} --> ${printEndpoint(target)}${guard}`;
}

export function printActivity(model: UmlModel, options?: { name?: string }): string {
  const lines: string[] = ["diagram activity"];
  if (options?.name !== undefined) {
    lines[0] = `diagram activity ${options.name}`;
  }

  const partitions = model.elements.filter(
    (element) => element.elementType === "activityPartition" && element.parentId === undefined,
  );
  for (const partition of partitions) {
    lines.push("");
    lines.push(`partition ${partition.name} {`);
    lines.push(...printBody(model, partition.id, "  "));
    lines.push("}");
  }

  const regions = model.elements.filter(
    (element) =>
      element.elementType === "interruptibleActivityRegion" && element.parentId === undefined,
  );
  for (const region of regions) {
    lines.push("");
    lines.push(`interruptible ${region.name} {`);
    lines.push(...printBody(model, region.id, "  "));
    lines.push("}");
  }

  const topLevelNodes = model.elements.filter(
    (element) =>
      element.parentId === undefined &&
      element.elementType !== "activityPartition" &&
      element.elementType !== "interruptibleActivityRegion" &&
      needsDeclaration(element),
  );
  if (topLevelNodes.length > 0) {
    lines.push("");
    for (const node of topLevelNodes) {
      const line = printNodeLine(node);
      if (line !== undefined) {
        lines.push(line);
      }
    }
  }

  const elementById = new Map(model.elements.map((element) => [element.id, element]));
  const flows = model.relationships.filter(isActivityFlowRelationship);
  if (flows.length > 0) {
    lines.push("");
    for (const flow of flows) {
      lines.push(printFlow(flow, elementById));
    }
  }

  return `${lines.join("\n")}\n`;
}

export function structuralActivityModel(model: UmlModel) {
  const nameById = new Map(model.elements.map((element) => [element.id, element.name]));

  return {
    kind: model.kind,
    elements: model.elements
      .filter((element) => element.elementType !== "note")
      .map((element) => ({
        name: element.name,
        elementType: element.elementType,
        parentName:
          element.parentId !== undefined ? nameById.get(element.parentId) : undefined,
      })),
    flows: model.relationships.flatMap((relationship) => {
      if (!isActivityFlowRelationship(relationship)) {
        return [];
      }
      return [
        {
          sourceName: nameById.get(relationship.sourceId),
          targetName: nameById.get(relationship.targetId),
          relationshipType: relationship.relationshipType,
          guard: relationship.guard,
        },
      ];
    }),
  };
}

export type StructuralActivityModel = ReturnType<typeof structuralActivityModel>;
