import type { UmlElement, UmlModel, UmlRelationship } from "@graphiq/uml-model";

function printTaggedValues(element: UmlElement): string {
  if (element.elementType !== "stereotype" || element.attributes.length === 0) {
    return "";
  }

  const lines = element.attributes.map((attribute) => `  ${attribute.name}: ${attribute.typeName}`);
  return ` {\n${lines.join("\n")}\n}`;
}

function printTopLevelElements(model: UmlModel): string[] {
  const lines: string[] = [];

  for (const element of model.elements) {
    switch (element.elementType) {
      case "stereotype":
        lines.push("");
        lines.push(`stereotype ${element.name}${printTaggedValues(element)}`);
        break;
      case "metaclass":
        lines.push("");
        lines.push(`metaclass ${element.name}`);
        break;
      case "profile":
        lines.push("");
        lines.push(`profile ${element.name}`);
        break;
      case "enumeration":
        lines.push("");
        if (element.literals.length === 0) {
          lines.push(`enum ${element.name} {}`);
        } else {
          lines.push(`enum ${element.name} {`);
          for (const literal of element.literals) {
            lines.push(`  ${literal}`);
          }
          lines.push("}");
        }
        break;
      default:
        break;
    }
  }

  return lines;
}

function printRelationship(relationship: UmlRelationship, nameById: ReadonlyMap<string, string>): string | undefined {
  const sourceName = nameById.get(relationship.sourceId);
  const targetName = nameById.get(relationship.targetId);
  if (sourceName === undefined || targetName === undefined) {
    return undefined;
  }

  switch (relationship.relationshipType) {
    case "extension":
      return `extension ${sourceName} -> ${targetName}`;
    case "generalization":
      return `${sourceName} --|> ${targetName}`;
    default:
      return undefined;
  }
}

export function printProfile(model: UmlModel, options?: { name?: string }): string {
  const lines: string[] = ["diagram profile"];
  if (options?.name !== undefined) {
    lines[0] = `diagram profile ${options.name}`;
  }

  lines.push(...printTopLevelElements(model));

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

export function structuralProfileModel(model: UmlModel) {
  const nameById = new Map(model.elements.map((element) => [element.id, element.name]));

  return {
    kind: model.kind,
    elements: model.elements
      .filter((element) => element.elementType !== "note")
      .map((element) => ({
        name: element.name,
        elementType: element.elementType,
        attributes:
          element.elementType === "stereotype"
            ? element.attributes.map((attribute) => ({
                name: attribute.name,
                typeName: attribute.typeName,
              }))
            : undefined,
        literals: element.elementType === "enumeration" ? [...element.literals] : undefined,
      })),
    relationships: model.relationships.map((relationship) => ({
      relationshipType: relationship.relationshipType,
      sourceName: nameById.get(relationship.sourceId),
      targetName: nameById.get(relationship.targetId),
    })),
  };
}

export type StructuralProfileModel = ReturnType<typeof structuralProfileModel>;
