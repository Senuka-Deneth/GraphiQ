import { assertNever } from "@graphiq/uml-core";
import type {
  InstanceSpecificationElement,
  UmlElement,
  UmlModel,
  UmlRelationship,
} from "@graphiq/uml-model";

function formatSlotValue(value: string): string {
  if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(value)) {
    return value;
  }
  return `"${value.replace(/"/g, '\\"')}"`;
}

function printInstance(element: InstanceSpecificationElement): string {
  if (element.slots.length === 0) {
    return `instance ${element.name}: ${element.classifierName}`;
  }

  const slotLines = element.slots.map(
    (slot) => `  ${slot.featureName} = ${formatSlotValue(slot.value)}`,
  );
  return `instance ${element.name}: ${element.classifierName} {\n${slotLines.join("\n")}\n}`;
}

function printRelationship(
  relationship: UmlRelationship,
  nameById: ReadonlyMap<string, string>,
): string {
  const sourceName = nameById.get(relationship.sourceId);
  const targetName = nameById.get(relationship.targetId);
  if (sourceName === undefined || targetName === undefined) {
    throw new Error("Relationship endpoints must reference printable elements");
  }

  const arrow = relationship.relationshipType === "dependency" ? "..>" : "--";
  const label = relationship.name !== undefined ? ` : ${relationship.name}` : "";
  return `${sourceName} ${arrow} ${targetName}${label}`;
}

function isPrintableInstance(element: UmlElement): element is InstanceSpecificationElement {
  return element.elementType === "instanceSpecification";
}

type ObjectPrintableRelationship = UmlRelationship & {
  relationshipType: "link" | "dependency";
};

function isPrintableRelationship(
  relationship: UmlRelationship,
): relationship is ObjectPrintableRelationship {
  return relationship.relationshipType === "link" || relationship.relationshipType === "dependency";
}

function printObjectRelationship(
  relationship: ObjectPrintableRelationship,
  nameById: ReadonlyMap<string, string>,
): string {
  return printRelationship(relationship, nameById);
}

export function printObject(model: UmlModel, options?: { name?: string }): string {
  const lines: string[] = ["diagram object"];
  if (options?.name !== undefined) {
    lines[0] = `diagram object ${options.name}`;
  }

  const instances = model.elements.filter(isPrintableInstance);
  for (const instance of instances) {
    lines.push("");
    lines.push(printInstance(instance));
  }

  const nameById = new Map(model.elements.map((element) => [element.id, element.name]));
  const relationships = model.relationships.filter(isPrintableRelationship);

  if (relationships.length > 0) {
    lines.push("");
    for (const relationship of relationships) {
      lines.push(printObjectRelationship(relationship, nameById));
    }
  }

  return `${lines.join("\n")}\n`;
}

export function structuralObjectModel(model: UmlModel) {
  return {
    kind: model.kind,
    instances: model.elements
      .filter(isPrintableInstance)
      .map((instance) => ({
        name: instance.name,
        classifierName: instance.classifierName,
        slots: instance.slots.map((slot) => ({
          featureName: slot.featureName,
          value: slot.value,
        })),
      })),
    relationships: model.relationships.flatMap((relationship) => {
      if (!isPrintableRelationship(relationship)) {
        return [];
      }
      return [
        {
          sourceName: model.elements.find((element) => element.id === relationship.sourceId)?.name,
          targetName: model.elements.find((element) => element.id === relationship.targetId)?.name,
          relationshipType: relationship.relationshipType,
          name: relationship.name,
        },
      ];
    }),
  };
}

export type StructuralObjectModel = ReturnType<typeof structuralObjectModel>;

export function assertNeverObject(value: never): never {
  return assertNever(value);
}
