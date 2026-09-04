import type {
  InstanceSpecificationElement,
  MessageRelationship,
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

function isPrintableInstance(element: UmlElement): element is InstanceSpecificationElement {
  return element.elementType === "instanceSpecification";
}

function isMessageRelationship(relationship: UmlRelationship): relationship is MessageRelationship {
  return relationship.relationshipType === "message";
}

function printMessage(relationship: MessageRelationship, nameById: ReadonlyMap<string, string>): string {
  const sourceName = nameById.get(relationship.sourceId);
  const targetName = nameById.get(relationship.targetId);
  if (sourceName === undefined || targetName === undefined) {
    throw new Error("Message endpoints must reference printable elements");
  }

  const sequenceNumber = relationship.sequenceNumber ?? "1";
  const label =
    relationship.name !== undefined && relationship.name.length > 0
      ? `${sequenceNumber}: ${relationship.name}`
      : `${sequenceNumber}:`;

  return `${sourceName} -> ${targetName} : ${label}`;
}

function printLink(relationship: UmlRelationship, nameById: ReadonlyMap<string, string>): string {
  const sourceName = nameById.get(relationship.sourceId);
  const targetName = nameById.get(relationship.targetId);
  if (sourceName === undefined || targetName === undefined) {
    throw new Error("Link endpoints must reference printable elements");
  }

  const label = relationship.name !== undefined ? ` : ${relationship.name}` : "";
  return `${sourceName} -- ${targetName}${label}`;
}

export function printCommunication(model: UmlModel, options?: { name?: string }): string {
  const lines: string[] = ["diagram communication"];
  if (options?.name !== undefined) {
    lines[0] = `diagram communication ${options.name}`;
  }

  const instances = model.elements.filter(isPrintableInstance);
  for (const instance of instances) {
    lines.push("");
    lines.push(printInstance(instance));
  }

  const nameById = new Map(model.elements.map((element) => [element.id, element.name]));
  const messages = model.relationships.filter(isMessageRelationship);
  const links = model.relationships.filter(
    (relationship) => relationship.relationshipType === "link",
  );

  if (messages.length > 0 || links.length > 0) {
    lines.push("");
    for (const message of messages) {
      lines.push(printMessage(message, nameById));
    }
    for (const link of links) {
      lines.push(printLink(link, nameById));
    }
  }

  return `${lines.join("\n")}\n`;
}

export function structuralCommunicationModel(model: UmlModel) {
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
    messages: model.relationships.flatMap((relationship) => {
      if (!isMessageRelationship(relationship)) {
        return [];
      }
      return [
        {
          sourceName: model.elements.find((element) => element.id === relationship.sourceId)?.name,
          targetName: model.elements.find((element) => element.id === relationship.targetId)?.name,
          sequenceNumber: relationship.sequenceNumber,
          messageName: relationship.name,
          messageSort: relationship.messageSort,
        },
      ];
    }),
    links: model.relationships.flatMap((relationship) => {
      if (relationship.relationshipType !== "link") {
        return [];
      }
      return [
        {
          sourceName: model.elements.find((element) => element.id === relationship.sourceId)?.name,
          targetName: model.elements.find((element) => element.id === relationship.targetId)?.name,
          name: relationship.name,
        },
      ];
    }),
  };
}

export type StructuralCommunicationModel = ReturnType<typeof structuralCommunicationModel>;
