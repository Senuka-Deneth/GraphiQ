import { assertNever, createId, err, ok } from "@graphiq/uml-core";
import type { Result } from "@graphiq/uml-core";
import { isElementAllowedOn, isRelationshipAllowedOn } from "./allowed.js";
import type { NewUmlElement, UmlElement } from "./element.js";
import type { Attribute, MessageSort, Operation } from "./members.js";
import type { UmlModel } from "./model.js";
import type { NewUmlRelationship, UmlRelationship } from "./relationship.js";
import {
  isActivityFlowRelationship,
  isAssociationFamilyRelationship,
  isTransitionRelationship,
} from "./relationship.js";
import type { RelationshipType } from "./relationshipType.js";

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
        operands: spec.operands ?? [],
      };
    case "lifeline":
      return {
        id,
        elementType: "lifeline",
        name: spec.name,
        parentId: spec.parentId,
        classifierName: spec.classifierName,
      };
    case "executionSpecification":
      return {
        id,
        elementType: "executionSpecification",
        name: spec.name,
        parentId: spec.parentId,
        startMessageId: spec.startMessageId,
        finishMessageId: spec.finishMessageId,
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
    case "stereotype":
      return {
        id,
        elementType: "stereotype",
        name: spec.name,
        parentId: spec.parentId,
        attributes: spec.attributes ?? [],
      };
    case "part":
      return {
        id,
        elementType: "part",
        name: spec.name,
        parentId: spec.parentId,
        typeName: spec.typeName,
        multiplicity: spec.multiplicity,
      };
    case "port":
      return {
        id,
        elementType: "port",
        name: spec.name,
        parentId: spec.parentId,
        typeName: spec.typeName,
      };
    case "timingState":
      return {
        id,
        elementType: "timingState",
        name: spec.name,
        parentId: spec.parentId,
        at: spec.at,
        until: spec.until,
      };
    case "durationConstraint":
      return {
        id,
        elementType: "durationConstraint",
        name: spec.name,
        parentId: spec.parentId,
        min: spec.min,
        max: spec.max,
      };
    case "timeConstraint":
      return {
        id,
        elementType: "timeConstraint",
        name: spec.name,
        parentId: spec.parentId,
        time: spec.time,
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

function createRelationship(spec: NewUmlRelationship, id = createId()): UmlRelationship {
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
        time: spec.time,
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
    case "controlFlow":
      return {
        id,
        relationshipType: "controlFlow",
        sourceId,
        targetId,
        name,
        guard: spec.guard,
      };
    case "objectFlow":
      return {
        id,
        relationshipType: "objectFlow",
        sourceId,
        targetId,
        name,
        guard: spec.guard,
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

function flowGuard(relationship: UmlRelationship): string | undefined {
  if (isActivityFlowRelationship(relationship) || isTransitionRelationship(relationship)) {
    return relationship.guard;
  }
  return undefined;
}

function toNewRelationship(
  existing: UmlRelationship,
  relationshipType: RelationshipType,
): NewUmlRelationship {
  const sourceId = existing.sourceId;
  const targetId = existing.targetId;
  const name = existing.name;

  switch (relationshipType) {
    case "association":
    case "navigableAssociation":
    case "aggregation":
    case "composition": {
      const sourceMultiplicity = isAssociationFamilyRelationship(existing)
        ? existing.sourceMultiplicity
        : "1";
      const targetMultiplicity = isAssociationFamilyRelationship(existing)
        ? existing.targetMultiplicity
        : "1";
      return {
        relationshipType,
        sourceId,
        targetId,
        name,
        sourceMultiplicity,
        targetMultiplicity,
      };
    }
    case "message":
      return {
        relationshipType: "message",
        sourceId,
        targetId,
        name,
        messageSort: existing.relationshipType === "message" ? existing.messageSort : "synchCall",
        sequenceNumber:
          existing.relationshipType === "message" ? existing.sequenceNumber : undefined,
        time: existing.relationshipType === "message" ? existing.time : undefined,
      };
    case "transition":
      return {
        relationshipType: "transition",
        sourceId,
        targetId,
        name,
        trigger: existing.relationshipType === "transition" ? existing.trigger : undefined,
        guard: flowGuard(existing),
        effect: existing.relationshipType === "transition" ? existing.effect : undefined,
      };
    case "controlFlow":
      return {
        relationshipType: "controlFlow",
        sourceId,
        targetId,
        name,
        guard: flowGuard(existing),
      };
    case "objectFlow":
      return {
        relationshipType: "objectFlow",
        sourceId,
        targetId,
        name,
        guard: flowGuard(existing),
      };
    case "generalization":
    case "realization":
    case "interfaceRealization":
    case "dependency":
    case "usage":
    case "nestedClassifier":
    case "link":
    case "packageImport":
    case "packageMerge":
    case "containment":
    case "connector":
    case "assemblyConnector":
    case "delegationConnector":
    case "componentRealization":
    case "deployment":
    case "communicationPath":
    case "manifestation":
    case "extension":
    case "include":
    case "extend":
      return {
        relationshipType,
        sourceId,
        targetId,
        name,
      };
    default:
      return assertNever(relationshipType);
  }
}

function replaceRelationship(
  model: UmlModel,
  next: UmlRelationship,
): UmlModel {
  return {
    ...model,
    relationships: model.relationships.map((relationship) =>
      relationship.id === next.id ? next : relationship,
    ),
  };
}

export function updateRelationshipType(
  model: UmlModel,
  id: string,
  relationshipType: RelationshipType,
): Result<UmlModel, ModelCommandError> {
  const existing = model.relationships.find((relationship) => relationship.id === id);
  if (existing === undefined) {
    return err({
      code: "unknown-relationship",
      message: `Relationship "${id}" was not found`,
    });
  }

  if (!isRelationshipAllowedOn(model.kind, relationshipType)) {
    return err({
      code: "illegal-relationship-on-diagram",
      message: `Relationship type "${relationshipType}" is not allowed on a ${model.kind} diagram`,
    });
  }

  const spec = toNewRelationship(existing, relationshipType);
  return ok(replaceRelationship(model, createRelationship(spec, existing.id)));
}

export function reverseRelationship(
  model: UmlModel,
  id: string,
): Result<UmlModel, ModelCommandError> {
  const existing = model.relationships.find((relationship) => relationship.id === id);
  if (existing === undefined) {
    return err({
      code: "unknown-relationship",
      message: `Relationship "${id}" was not found`,
    });
  }

  if (isAssociationFamilyRelationship(existing)) {
    return ok(
      replaceRelationship(model, {
        ...existing,
        sourceId: existing.targetId,
        targetId: existing.sourceId,
        sourceMultiplicity: existing.targetMultiplicity,
        targetMultiplicity: existing.sourceMultiplicity,
      }),
    );
  }

  return ok(
    replaceRelationship(model, {
      ...existing,
      sourceId: existing.targetId,
      targetId: existing.sourceId,
    }),
  );
}

export function setMessageSort(
  model: UmlModel,
  id: string,
  messageSort: MessageSort,
): Result<UmlModel, ModelCommandError> {
  const existing = model.relationships.find((relationship) => relationship.id === id);
  if (existing === undefined) {
    return err({
      code: "unknown-relationship",
      message: `Relationship "${id}" was not found`,
    });
  }

  if (existing.relationshipType !== "message") {
    return err({
      code: "illegal-relationship-on-diagram",
      message: "Only message relationships have a message sort",
    });
  }

  return ok(
    replaceRelationship(model, {
      ...existing,
      messageSort,
    }),
  );
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
