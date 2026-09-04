import { createId } from "@graphiq/uml-core";
import type {
  AstProfileEnumeration,
  AstStereotypeDeclaration,
  AstTaggedValue,
  ProfileDiagramAst,
} from "@graphiq/uml-dsl";
import {
  emptyModel,
  type Attribute,
  type UmlElement,
  type UmlModel,
  type UmlRelationship,
} from "@graphiq/uml-model";

function preservedNonDslElements(previous: UmlModel | undefined): UmlElement[] {
  if (!previous) {
    return [];
  }

  return previous.elements.filter((element) => element.elementType === "note");
}

function findPreviousElement(
  previous: UmlModel | undefined,
  name: string,
  elementType: UmlElement["elementType"],
): UmlElement | undefined {
  if (!previous) {
    return undefined;
  }

  return previous.elements.find(
    (element) => element.name === name && element.elementType === elementType,
  );
}

function findPreviousRelationship(
  previous: UmlModel | undefined,
  sourceId: string,
  targetId: string,
  relationshipType: UmlRelationship["relationshipType"],
): UmlRelationship | undefined {
  if (!previous) {
    return undefined;
  }

  return previous.relationships.find(
    (relationship) =>
      relationship.sourceId === sourceId &&
      relationship.targetId === targetId &&
      relationship.relationshipType === relationshipType,
  );
}

function mergeTaggedValues(
  values: readonly AstTaggedValue[],
  previousAttributes: readonly Attribute[] = [],
): Attribute[] {
  const previousByName = new Map(previousAttributes.map((attribute) => [attribute.name, attribute]));

  return values.map((value) => {
    const previous = previousByName.get(value.name);
    return {
      id: previous?.id ?? createId(),
      visibility: previous?.visibility ?? "public",
      name: value.name,
      typeName: value.typeName,
    };
  });
}

function addStereotype(
  model: UmlModel,
  declaration: AstStereotypeDeclaration,
  previous?: UmlModel,
): UmlModel {
  const previousElement = findPreviousElement(previous, declaration.name, "stereotype");
  const element: UmlElement = {
    id: previousElement?.id ?? createId(),
    elementType: "stereotype",
    name: declaration.name,
    attributes: mergeTaggedValues(
      declaration.attributes,
      previousElement?.elementType === "stereotype" ? previousElement.attributes : [],
    ),
  };

  return {
    ...model,
    elements: [...model.elements.filter((item) => item.id !== element.id), element],
  };
}

function addNamed(
  model: UmlModel,
  elementType: Extract<UmlElement["elementType"], "metaclass" | "profile">,
  name: string,
  previous?: UmlModel,
): { model: UmlModel; id: string } {
  const previousElement = findPreviousElement(previous, name, elementType);
  const element: UmlElement = {
    id: previousElement?.id ?? createId(),
    elementType,
    name,
  };

  return {
    model: {
      ...model,
      elements: [...model.elements.filter((item) => item.id !== element.id), element],
    },
    id: element.id,
  };
}

function addEnumeration(
  model: UmlModel,
  declaration: AstProfileEnumeration,
  previous?: UmlModel,
): UmlModel {
  const previousElement = findPreviousElement(previous, declaration.name, "enumeration");
  const element: UmlElement = {
    id: previousElement?.id ?? createId(),
    elementType: "enumeration",
    name: declaration.name,
    literals: [...declaration.literals],
  };

  return {
    ...model,
    elements: [...model.elements.filter((item) => item.id !== element.id), element],
  };
}

function addRelationshipIfMissing(
  model: UmlModel,
  relationshipType: Extract<UmlRelationship["relationshipType"], "extension" | "generalization">,
  sourceId: string,
  targetId: string,
  previous?: UmlModel,
): UmlModel {
  if (
    model.relationships.some(
      (relationship) =>
        relationship.sourceId === sourceId &&
        relationship.targetId === targetId &&
        relationship.relationshipType === relationshipType,
    )
  ) {
    return model;
  }

  const previousRelationship = findPreviousRelationship(
    previous,
    sourceId,
    targetId,
    relationshipType,
  );

  const nextRelationship: UmlRelationship = {
    id: previousRelationship?.id ?? createId(),
    relationshipType,
    sourceId,
    targetId,
  };

  return {
    ...model,
    relationships: [...model.relationships, nextRelationship],
  };
}

function findElementId(model: UmlModel, name: string, elementType: UmlElement["elementType"]): string {
  const element = model.elements.find(
    (item) => item.name === name && item.elementType === elementType,
  );
  if (element === undefined) {
    throw new Error(`Element "${name}" (${elementType}) was not found`);
  }
  return element.id;
}

export function profileAstToModel(ast: ProfileDiagramAst, previous?: UmlModel): UmlModel {
  const base = previous ?? emptyModel("profile");
  let model: UmlModel = {
    id: base.id,
    kind: "profile",
    elements: preservedNonDslElements(previous),
    relationships: [],
  };

  for (const stereotype of ast.stereotypes) {
    model = addStereotype(model, stereotype, previous);
  }
  for (const metaclass of ast.metaclasses) {
    model = addNamed(model, "metaclass", metaclass.name, previous).model;
  }
  for (const frame of ast.profiles) {
    model = addNamed(model, "profile", frame.name, previous).model;
  }
  for (const enumeration of ast.enumerations) {
    model = addEnumeration(model, enumeration, previous);
  }

  for (const relationship of ast.relationships) {
    switch (relationship.relationshipKind) {
      case "extension": {
        const sourceId = findElementId(model, relationship.sourceName, "stereotype");
        const targetAdded = addNamed(model, "metaclass", relationship.targetName, previous);
        model = addRelationshipIfMissing(
          targetAdded.model,
          "extension",
          sourceId,
          targetAdded.id,
          previous,
        );
        break;
      }
      case "generalization": {
        const sourceId = findElementId(model, relationship.sourceName, "stereotype");
        const targetId = findElementId(model, relationship.targetName, "stereotype");
        model = addRelationshipIfMissing(model, "generalization", sourceId, targetId, previous);
        break;
      }
      default: {
        const exhaustive: never = relationship;
        return exhaustive;
      }
    }
  }

  return model;
}
