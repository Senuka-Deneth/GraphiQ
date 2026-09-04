import { createId, err, ok } from "@graphiq/uml-core";
import type { Result } from "@graphiq/uml-core";
import { isElementAllowedOn, isRelationshipAllowedOn } from "./allowed.js";
import type { NewUmlElement, UmlElement } from "./element.js";
import type { Attribute, Operation } from "./members.js";
import type { UmlModel } from "./model.js";
import type { NewUmlRelationship, UmlRelationship } from "./relationship.js";

export type ModelCommandError = {
  code:
    | "illegal-element-on-diagram"
    | "illegal-relationship-on-diagram"
    | "unknown-element"
    | "unknown-relationship";
  message: string;
};

function createElement(spec: NewUmlElement): UmlElement {
  const id = createId();

  switch (spec.elementType) {
    case "class":
      return {
        id,
        elementType: "class",
        name: spec.name,
        parentId: spec.parentId,
        isAbstract: spec.isAbstract ?? false,
        attributes: spec.attributes ?? [],
        operations: spec.operations ?? [],
      };
    case "interface":
      return {
        id,
        elementType: "interface",
        name: spec.name,
        parentId: spec.parentId,
        attributes: spec.attributes ?? [],
        operations: spec.operations ?? [],
      };
    case "dataType":
      return {
        id,
        elementType: "dataType",
        name: spec.name,
        parentId: spec.parentId,
        attributes: spec.attributes ?? [],
        operations: spec.operations ?? [],
      };
    case "primitiveType":
      return {
        id,
        elementType: "primitiveType",
        name: spec.name,
        parentId: spec.parentId,
        attributes: spec.attributes ?? [],
        operations: spec.operations ?? [],
      };
    case "associationClass":
      return {
        id,
        elementType: "associationClass",
        name: spec.name,
        parentId: spec.parentId,
        isAbstract: spec.isAbstract ?? false,
        attributes: spec.attributes ?? [],
        operations: spec.operations ?? [],
      };
    case "enumeration":
      return {
        id,
        elementType: "enumeration",
        name: spec.name,
        parentId: spec.parentId,
        literals: spec.literals ?? [],
      };
    case "instanceSpecification":
      return {
        id,
        elementType: "instanceSpecification",
        name: spec.name,
        parentId: spec.parentId,
        classifierName: spec.classifierName,
        slots: spec.slots ?? [],
      };
    case "pseudostate":
      return {
        id,
        elementType: "pseudostate",
        name: spec.name,
        parentId: spec.parentId,
        kind: spec.kind,
      };
    case "combinedFragment":
      return {
        id,
        elementType: "combinedFragment",
        name: spec.name,
        parentId: spec.parentId,
        operator: spec.operator,
      };
    case "state":
      return {
        id,
        elementType: "state",
        name: spec.name,
        parentId: spec.parentId,
        entry: spec.entry,
        do: spec.do,
        exit: spec.exit,
      };
    default:
      return {
        id,
        elementType: spec.elementType,
        name: spec.name,
        parentId: spec.parentId,
      };
  }
}

function createRelationship(spec: NewUmlRelationship): UmlRelationship {
  const id = createId();
  const { sourceId, targetId, name } = spec;

  switch (spec.relationshipType) {
    case "association":
      return {
        id,
        relationshipType: "association",
        sourceId,
        targetId,
        name,
        sourceMultiplicity: spec.sourceMultiplicity ?? "1",
        targetMultiplicity: spec.targetMultiplicity ?? "1",
      };
    case "navigableAssociation":
      return {
        id,
        relationshipType: "navigableAssociation",
        sourceId,
        targetId,
        name,
        sourceMultiplicity: spec.sourceMultiplicity ?? "1",
        targetMultiplicity: spec.targetMultiplicity ?? "1",
      };
    case "aggregation":
      return {
        id,
        relationshipType: "aggregation",
        sourceId,
        targetId,
        name,
        sourceMultiplicity: spec.sourceMultiplicity ?? "1",
        targetMultiplicity: spec.targetMultiplicity ?? "1",
      };
    case "composition":
      return {
        id,
        relationshipType: "composition",
        sourceId,
        targetId,
        name,
        sourceMultiplicity: spec.sourceMultiplicity ?? "1",
        targetMultiplicity: spec.targetMultiplicity ?? "1",
      };
    case "message":
      return {
        id,
        relationshipType: "message",
        sourceId,
        targetId,
        name,
        messageSort: spec.messageSort,
        sequenceNumber: spec.sequenceNumber,
      };
    case "transition":
      return {
        id,
        relationshipType: "transition",
        sourceId,
        targetId,
        name,
        trigger: spec.trigger,
        guard: spec.guard,
        effect: spec.effect,
      };
    default:
      return {
        id,
        relationshipType: spec.relationshipType,
        sourceId,
        targetId,
        name,
      };
  }
}

export function addElement(
  model: UmlModel,
  spec: NewUmlElement,
): Result<UmlModel, ModelCommandError> {
  if (!isElementAllowedOn(model.kind, spec.elementType)) {
    return err({
      code: "illegal-element-on-diagram",
      message: `Element type "${spec.elementType}" is not allowed on a ${model.kind} diagram`,
    });
  }

  const element = createElement(spec);
  return ok({
    ...model,
    elements: [...model.elements, element],
  });
}

export function removeElement(
  model: UmlModel,
  id: string,
): Result<UmlModel, ModelCommandError> {
  if (!model.elements.some((element) => element.id === id)) {
    return err({
      code: "unknown-element",
      message: `Element "${id}" was not found`,
    });
  }

  return ok({
    ...model,
    elements: model.elements.filter((element) => element.id !== id),
    relationships: model.relationships.filter(
      (relationship) =>
        relationship.sourceId !== id && relationship.targetId !== id,
    ),
  });
}

export function addRelationship(
  model: UmlModel,
  spec: NewUmlRelationship,
): Result<UmlModel, ModelCommandError> {
  if (!isRelationshipAllowedOn(model.kind, spec.relationshipType)) {
    return err({
      code: "illegal-relationship-on-diagram",
      message: `Relationship type "${spec.relationshipType}" is not allowed on a ${model.kind} diagram`,
    });
  }

  const sourceExists = model.elements.some(
    (element) => element.id === spec.sourceId,
  );
  const targetExists = model.elements.some(
    (element) => element.id === spec.targetId,
  );

  if (!sourceExists || !targetExists) {
    return err({
      code: "unknown-element",
      message: "Relationship endpoints must reference existing elements",
    });
  }

  const relationship = createRelationship(spec);
  return ok({
    ...model,
    relationships: [...model.relationships, relationship],
  });
}

export function removeRelationship(
  model: UmlModel,
  id: string,
): Result<UmlModel, ModelCommandError> {
  if (!model.relationships.some((relationship) => relationship.id === id)) {
    return err({
      code: "unknown-relationship",
      message: `Relationship "${id}" was not found`,
    });
  }

  return ok({
    ...model,
    relationships: model.relationships.filter(
      (relationship) => relationship.id !== id,
    ),
  });
}

export function renameElement(
  model: UmlModel,
  id: string,
  name: string,
): Result<UmlModel, ModelCommandError> {
  const index = model.elements.findIndex((element) => element.id === id);
  if (index === -1) {
    return err({
      code: "unknown-element",
      message: `Element "${id}" was not found`,
    });
  }

  const elements = [...model.elements];
  const current = elements[index];
  if (current === undefined) {
    return err({
      code: "unknown-element",
      message: `Element "${id}" was not found`,
    });
  }

  elements[index] = {
    ...current,
    name,
  };

  return ok({
    ...model,
    elements,
  });
}

export function setClassAttribute(
  model: UmlModel,
  elementId: string,
  attributeId: string,
  attribute: Attribute,
): Result<UmlModel, ModelCommandError> {
  const index = model.elements.findIndex((element) => element.id === elementId);
  if (index === -1) {
    return err({
      code: "unknown-element",
      message: `Element "${elementId}" was not found`,
    });
  }

  const current = model.elements[index];
  if (
    current?.elementType !== "class" &&
    current?.elementType !== "interface" &&
    current?.elementType !== "dataType" &&
    current?.elementType !== "primitiveType" &&
    current?.elementType !== "associationClass"
  ) {
    return err({
      code: "unknown-element",
      message: `Element "${elementId}" does not support attributes`,
    });
  }

  const attributes = current.attributes.map((existing) =>
    existing.id === attributeId ? attribute : existing,
  );

  const elements = [...model.elements];
  elements[index] = {
    ...current,
    attributes,
  };

  return ok({
    ...model,
    elements,
  });
}

export function setClassOperation(
  model: UmlModel,
  elementId: string,
  operationId: string,
  operation: Operation,
): Result<UmlModel, ModelCommandError> {
  const index = model.elements.findIndex((element) => element.id === elementId);
  if (index === -1) {
    return err({
      code: "unknown-element",
      message: `Element "${elementId}" was not found`,
    });
  }

  const current = model.elements[index];
  if (
    current?.elementType !== "class" &&
    current?.elementType !== "interface" &&
    current?.elementType !== "dataType" &&
    current?.elementType !== "primitiveType" &&
    current?.elementType !== "associationClass"
  ) {
    return err({
      code: "unknown-element",
      message: `Element "${elementId}" does not support operations`,
    });
  }

  const operations = current.operations.map((existing) =>
    existing.id === operationId ? operation : existing,
  );

  const elements = [...model.elements];
  elements[index] = {
    ...current,
    operations,
  };

  return ok({
    ...model,
    elements,
  });
}
