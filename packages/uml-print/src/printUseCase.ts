import type { UmlElement, UmlModel, UmlRelationship } from "@graphiq/uml-model";

function printActors(model: UmlModel): string[] {
  const lines: string[] = [];
  for (const element of model.elements) {
    if (element.elementType === "actor" && element.parentId === undefined) {
      lines.push("");
      lines.push(`actor ${element.name}`);
    }
  }
  return lines;
}

function printSubjects(model: UmlModel): string[] {
  const lines: string[] = [];
  const subjects = model.elements.filter(
    (element) => element.elementType === "subject" && element.parentId === undefined,
  );

  for (const subject of subjects) {
    const nestedUseCases = model.elements.filter(
      (element) => element.elementType === "useCase" && element.parentId === subject.id,
    );
    lines.push("");
    if (nestedUseCases.length === 0) {
      lines.push(`subject ${subject.name} {}`);
      continue;
    }

    lines.push(`subject ${subject.name} {`);
    for (const useCase of nestedUseCases) {
      lines.push(`  usecase ${useCase.name}`);
    }
    lines.push("}");
  }

  return lines;
}

function printStandaloneUseCases(model: UmlModel): string[] {
  const lines: string[] = [];
  for (const element of model.elements) {
    if (element.elementType === "useCase" && element.parentId === undefined) {
      lines.push("");
      lines.push(`usecase ${element.name}`);
    }
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
    case "association":
      return `${sourceName} -- ${targetName}`;
    case "include":
      return `${sourceName} ..> ${targetName} : «include»`;
    case "extend":
      return `${sourceName} ..> ${targetName} : «extend»`;
    case "generalization":
      return `${sourceName} --|> ${targetName}`;
    default:
      return undefined;
  }
}

export function printUseCase(model: UmlModel, options?: { name?: string }): string {
  const lines: string[] = ["diagram useCase"];
  if (options?.name !== undefined) {
    lines[0] = `diagram useCase ${options.name}`;
  }

  lines.push(...printActors(model));
  lines.push(...printSubjects(model));
  lines.push(...printStandaloneUseCases(model));

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

export function structuralUseCaseModel(model: UmlModel) {
  const nameById = new Map(model.elements.map((element) => [element.id, element.name]));

  return {
    kind: model.kind,
    elements: model.elements
      .filter((element) => element.elementType !== "note")
      .map((element: UmlElement) => ({
        name: element.name,
        elementType: element.elementType,
        parentName:
          element.parentId !== undefined ? nameById.get(element.parentId) : undefined,
      })),
    relationships: model.relationships.map((relationship) => ({
      relationshipType: relationship.relationshipType,
      sourceName: nameById.get(relationship.sourceId),
      targetName: nameById.get(relationship.targetId),
    })),
  };
}

export type StructuralUseCaseModel = ReturnType<typeof structuralUseCaseModel>;
