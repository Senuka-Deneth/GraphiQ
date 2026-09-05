import { assertNever } from "@graphiq/uml-core";
import type { UmlElement, UmlModel, UmlRelationship } from "@graphiq/uml-model";

function needsDeclaration(element: UmlElement, referencedRefNames: ReadonlySet<string>): boolean {
  switch (element.elementType) {
    case "note":
      return false;
    case "initialNode":
      return element.name !== "initial";
    case "activityFinalNode":
      return element.name !== "final";
    case "interactionUse":
      return !referencedRefNames.has(element.name);
    case "decisionNode":
    case "mergeNode":
    case "forkNode":
    case "joinNode":
      return true;
    default:
      return false;
  }
}

function printEndpoint(element: UmlElement): string {
  if (element.elementType === "initialNode" && element.name === "initial") {
    return "initial";
  }
  if (element.elementType === "activityFinalNode" && element.name === "final") {
    return "final";
  }
  if (element.elementType === "interactionUse") {
    return `ref ${element.name}`;
  }
  return element.name;
}

function printNodeLine(element: UmlElement): string | undefined {
  switch (element.elementType) {
    case "interactionUse":
      return `ref ${element.name}`;
    case "decisionNode":
      return `decision ${element.name}`;
    case "mergeNode":
      return `merge ${element.name}`;
    case "forkNode":
      return `fork ${element.name}`;
    case "joinNode":
      return `join ${element.name}`;
    case "initialNode":
      return element.name === "initial" ? undefined : `initial ${element.name}`;
    case "activityFinalNode":
      return element.name === "final" ? undefined : `final ${element.name}`;
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
    case "activity":
    case "action":
    case "objectNode":
    case "flowFinalNode":
    case "activityPartition":
    case "interruptibleActivityRegion":
    case "stateMachine":
    case "region":
    case "state":
    case "pseudostate":
    case "finalState":
    case "interaction":
    case "lifeline":
    case "executionSpecification":
    case "combinedFragment":
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
    relationship.relationshipType === "controlFlow" &&
    relationship.guard !== undefined &&
    relationship.guard.length > 0
      ? ` : [${relationship.guard}]`
      : "";

  return `${printEndpoint(source)} --> ${printEndpoint(target)}${guard}`;
}

export function printInteractionOverview(model: UmlModel, options?: { name?: string }): string {
  const lines: string[] = ["diagram interactionOverview"];
  if (options?.name !== undefined) {
    lines[0] = `diagram interactionOverview ${options.name}`;
  }

  const elementById = new Map(model.elements.map((element) => [element.id, element]));
  const flows = model.relationships.filter(
    (relationship) => relationship.relationshipType === "controlFlow",
  );
  const referencedRefNames = new Set(
    flows.flatMap((relationship) => {
      const source = elementById.get(relationship.sourceId);
      const target = elementById.get(relationship.targetId);
      const names: string[] = [];
      if (source?.elementType === "interactionUse") {
        names.push(source.name);
      }
      if (target?.elementType === "interactionUse") {
        names.push(target.name);
      }
      return names;
    }),
  );

  const declarations = model.elements.filter((element) =>
    needsDeclaration(element, referencedRefNames),
  );
  if (declarations.length > 0) {
    lines.push("");
    for (const element of declarations) {
      const line = printNodeLine(element);
      if (line !== undefined) {
        lines.push(line);
      }
    }
  }

  if (flows.length > 0) {
    lines.push("");
    for (const flow of flows) {
      lines.push(printFlow(flow, elementById));
    }
  }

  return `${lines.join("\n")}\n`;
}

export function structuralInteractionOverviewModel(model: UmlModel) {
  const nameById = new Map(model.elements.map((element) => [element.id, element.name]));

  return {
    kind: model.kind,
    elements: model.elements
      .filter((element) => element.elementType !== "note")
      .map((element) => ({
        name: element.name,
        elementType: element.elementType,
      })),
    flows: model.relationships.flatMap((relationship) => {
      if (relationship.relationshipType !== "controlFlow") {
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

export type StructuralInteractionOverviewModel = ReturnType<
  typeof structuralInteractionOverviewModel
>;
