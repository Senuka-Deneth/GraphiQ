import { createId } from "@graphiq/uml-core";
import type { CommunicationDiagramAst } from "@graphiq/uml-dsl";
import {
  addElement,
  emptyModel,
  type InstanceSpecificationElement,
  type Slot,
  type UmlElement,
  type UmlModel,
  type UmlRelationship,
} from "@graphiq/uml-model";

function findPreviousInstance(
  previous: UmlModel | undefined,
  name: string,
): InstanceSpecificationElement | undefined {
  if (!previous) {
    return undefined;
  }

  const element = previous.elements.find(
    (item) => item.elementType === "instanceSpecification" && item.name === name,
  );
  return element?.elementType === "instanceSpecification" ? element : undefined;
}

function mergeSlots(
  astSlots: CommunicationDiagramAst["instances"][number]["slots"],
): Slot[] {
  return astSlots.map((slot) => ({
    featureName: slot.featureName,
    value: slot.value,
  }));
}

function preservedNonDslElements(previous: UmlModel | undefined): UmlElement[] {
  if (!previous) {
    return [];
  }

  return previous.elements.filter((element) => element.elementType === "note");
}

function findPreviousRelationship(
  previous: UmlModel | undefined,
  sourceId: string,
  targetId: string,
  relationshipType: UmlRelationship["relationshipType"],
  sequenceNumber?: string,
): UmlRelationship | undefined {
  if (!previous) {
    return undefined;
  }

  return previous.relationships.find((relationship) => {
    if (
      relationship.sourceId !== sourceId ||
      relationship.targetId !== targetId ||
      relationship.relationshipType !== relationshipType
    ) {
      return false;
    }

    if (relationshipType === "message" && relationship.relationshipType === "message") {
      return relationship.sequenceNumber === sequenceNumber;
    }

    return true;
  });
}

function elementIdByName(model: UmlModel, name: string): string {
  const element = model.elements.find((item) => item.name === name);
  if (element === undefined) {
    throw new Error(`Element "${name}" was not found`);
  }
  return element.id;
}

function ensureInstanceByName(
  model: UmlModel,
  name: string,
  previous?: UmlModel,
): UmlModel {
  if (model.elements.some((element) => element.name === name)) {
    return model;
  }

  const previousElement = previous?.elements.find((element) => element.name === name);
  if (
    previousElement !== undefined &&
    previousElement.elementType === "instanceSpecification"
  ) {
    return {
      ...model,
      elements: [...model.elements, previousElement],
    };
  }

  const result = addElement(model, {
    elementType: "instanceSpecification",
    name,
    classifierName: name,
  });
  if (!result.ok) {
    throw new Error(result.error.message);
  }
  return result.value;
}

export function communicationAstToModel(
  ast: CommunicationDiagramAst,
  previous?: UmlModel,
): UmlModel {
  const base = previous ?? emptyModel("communication");
  let model: UmlModel = {
    id: base.id,
    kind: "communication",
    elements: preservedNonDslElements(previous),
    relationships: [],
  };

  for (const instance of ast.instances) {
    const previousInstance = findPreviousInstance(previous, instance.name);
    const element: InstanceSpecificationElement = {
      id: previousInstance?.id ?? createId(),
      elementType: "instanceSpecification",
      name: instance.name,
      classifierName: instance.classifierName,
      slots: mergeSlots(instance.slots),
    };
    model = {
      ...model,
      elements: [...model.elements.filter((item) => item.id !== element.id), element],
    };
  }

  for (const message of ast.messages) {
    model = ensureInstanceByName(model, message.sourceName, previous);
    model = ensureInstanceByName(model, message.targetName, previous);

    const sourceId = elementIdByName(model, message.sourceName);
    const targetId = elementIdByName(model, message.targetName);
    const previousRelationship = findPreviousRelationship(
      previous,
      sourceId,
      targetId,
      "message",
      message.sequenceNumber,
    );

    const nextRelationship: UmlRelationship = {
      id: previousRelationship?.id ?? createId(),
      relationshipType: "message",
      sourceId,
      targetId,
      messageSort: "synchCall",
      sequenceNumber: message.sequenceNumber,
      name: message.messageName,
    };

    model = {
      ...model,
      relationships: [...model.relationships, nextRelationship],
    };
  }

  for (const link of ast.links) {
    model = ensureInstanceByName(model, link.sourceName, previous);
    model = ensureInstanceByName(model, link.targetName, previous);

    const sourceId = elementIdByName(model, link.sourceName);
    const targetId = elementIdByName(model, link.targetName);
    const previousRelationship = findPreviousRelationship(
      previous,
      sourceId,
      targetId,
      "link",
    );

    const nextRelationship: UmlRelationship = {
      id: previousRelationship?.id ?? createId(),
      relationshipType: "link",
      sourceId,
      targetId,
      name: link.name,
    };

    model = {
      ...model,
      relationships: [...model.relationships, nextRelationship],
    };
  }

  return model;
}
