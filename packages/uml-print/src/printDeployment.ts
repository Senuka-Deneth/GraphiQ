import type { UmlElement, UmlModel, UmlRelationship } from "@graphiq/uml-model";

function isNodeish(element: UmlElement): boolean {
  return (
    element.elementType === "node" ||
    element.elementType === "device" ||
    element.elementType === "executionEnvironment"
  );
}

function printName(name: string): string {
  if (/^[A-Za-z_][A-Za-z0-9_.]*$/.test(name)) {
    return name;
  }
  return JSON.stringify(name);
}

function printNodeHeader(element: UmlElement): string {
  const printedName = printName(element.name);
  switch (element.elementType) {
    case "device":
      return `node ${printedName} <<device>>`;
    case "executionEnvironment":
      return `node ${printedName} <<executionEnvironment>>`;
    default:
      return `node ${printedName}`;
  }
}

function printTopLevelNodes(model: UmlModel): string[] {
  const lines: string[] = [];
  const nodes = model.elements.filter(
    (element) => isNodeish(element) && element.parentId === undefined,
  );

  for (const node of nodes) {
    const artifacts = model.elements.filter(
      (element) => element.elementType === "artifact" && element.parentId === node.id,
    );
    lines.push("");
    if (artifacts.length === 0) {
      lines.push(printNodeHeader(node));
      continue;
    }
    lines.push(`${printNodeHeader(node)} {`);
    for (const artifact of artifacts) {
      lines.push(`  artifact ${printName(artifact.name)}`);
    }
    lines.push("}");
  }

  return lines;
}

function printRelationship(
  relationship: UmlRelationship,
  nameById: ReadonlyMap<string, string>,
): string | undefined {
  const sourceName = nameById.get(relationship.sourceId);
  const targetName = nameById.get(relationship.targetId);
  if (sourceName === undefined || targetName === undefined) {
    return undefined;
  }

  switch (relationship.relationshipType) {
    case "communicationPath": {
      const printed = `${printName(sourceName)} -- ${printName(targetName)}`;
      return relationship.name !== undefined ? `${printed} : ${printName(relationship.name)}` : printed;
    }
    case "deployment":
      return `${printName(sourceName)} ..> ${printName(targetName)}`;
    case "generalization":
      return `${printName(sourceName)} --|> ${printName(targetName)}`;
    default:
      return undefined;
  }
}

export function printDeployment(model: UmlModel, options?: { name?: string }): string {
  const lines: string[] = ["diagram deployment"];
  if (options?.name !== undefined) {
    lines[0] = `diagram deployment ${options.name}`;
  }

  lines.push(...printTopLevelNodes(model));

  const nameById = new Map(model.elements.map((element) => [element.id, element.name]));
  const printable = model.relationships
    .map((relationship) => printRelationship(relationship, nameById))
    .filter((line): line is string => line !== undefined);

  if (printable.length > 0) {
    lines.push("");
    lines.push(...printable);
  }

  return `${lines.join("\n")}\n`;
}

export function structuralDeploymentModel(model: UmlModel) {
  const nameById = new Map(model.elements.map((element) => [element.id, element.name]));

  return {
    kind: model.kind,
    nodes: model.elements.filter(isNodeish).map((element) => ({
      name: element.name,
      elementType: element.elementType,
      parentName: element.parentId !== undefined ? nameById.get(element.parentId) : undefined,
    })),
    artifacts: model.elements
      .filter((element) => element.elementType === "artifact")
      .map((element) => ({
        name: element.name,
        parentName: element.parentId !== undefined ? nameById.get(element.parentId) : undefined,
      })),
    relationships: model.relationships.map((relationship) => ({
      relationshipType: relationship.relationshipType,
      sourceName: nameById.get(relationship.sourceId),
      targetName: nameById.get(relationship.targetId),
      name: relationship.name,
    })),
  };
}

export type StructuralDeploymentModel = ReturnType<typeof structuralDeploymentModel>;
