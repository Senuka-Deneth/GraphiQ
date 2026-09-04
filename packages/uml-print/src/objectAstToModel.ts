import { createId } from "@graphiq/uml-core";
import type { ObjectDiagramAst } from "@graphiq/uml-dsl";
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
  astSlots: ObjectDiagramAst["instances"][number]["slots"],
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
  name?: string,
): UmlRelationship | undefined {
  if (!previous) {
    return undefined;
  }

  return previous.relationships.find(
    (relationship) =>
      relationship.sourceId === sourceId &&
      relationship.targetId === targetId &&
      relationship.relationshipType === relationshipType &&
      relationship.name === name,
  );
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

export function objectAstToModel(ast: ObjectDiagramAst, previous?: UmlModel): UmlModel {
  const base = previous ?? emptyModel("object");
  let model: UmlModel = {
    id: base.id,
    kind: "object",
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

  for (const relationship of ast.relationships) {
    model = ensureInstanceByName(model, relationship.sourceName, previous);
    model = ensureInstanceByName(model, relationship.targetName, previous);

    const sourceId = elementIdByName(model, relationship.sourceName);
    const targetId = elementIdByName(model, relationship.targetName);
    const previousRelationship = findPreviousRelationship(
      previous,
      sourceId,
      targetId,
      relationship.relationshipType,
      relationship.name,
    );

    const nextRelationship: UmlRelationship = {
      id: previousRelationship?.id ?? createId(),
      relationshipType: relationship.relationshipType,
      sourceId,
      targetId,
      name: relationship.name,
    };

    model = {
      ...model,
      relationships: [...model.relationships, nextRelationship],
    };
  }

  return model;
}
