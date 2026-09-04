import type { UmlElement, UmlModel, UmlRelationship } from "@graphiq/uml-model";

function owningComponent(model: UmlModel, element: UmlElement | undefined): UmlElement | undefined {
  if (element === undefined) {
    return undefined;
  }

  if (element.parentId !== undefined) {
    return model.elements.find((item) => item.id === element.parentId);
  }

  const ownerRel = model.relationships.find(
    (relationship) =>
      (relationship.relationshipType === "interfaceRealization" ||
        relationship.relationshipType === "usage") &&
      relationship.targetId === element.id,
  );
  if (ownerRel === undefined) {
    return undefined;
  }
  return model.elements.find((item) => item.id === ownerRel.sourceId);
}

function isProvidedBy(model: UmlModel, componentId: string, interfaceId: string): boolean {
  return model.relationships.some(
    (relationship) =>
      relationship.relationshipType === "interfaceRealization" &&
      relationship.sourceId === componentId &&
      relationship.targetId === interfaceId,
  );
}

function isRequiredBy(model: UmlModel, componentId: string, interfaceId: string): boolean {
  return model.relationships.some(
    (relationship) =>
      relationship.relationshipType === "usage" &&
      relationship.sourceId === componentId &&
      relationship.targetId === interfaceId,
  );
}

function printComponentBody(model: UmlModel, componentId: string): string[] {
  const lines: string[] = [];
  const children = model.elements.filter((element) => element.parentId === componentId);

  for (const child of children) {
    if (child.elementType === "interface") {
      if (isProvidedBy(model, componentId, child.id)) {
        lines.push(`  provides ${child.name}`);
      }
      if (isRequiredBy(model, componentId, child.id)) {
        lines.push(`  requires ${child.name}`);
      }
      continue;
    }

    if (child.elementType === "port") {
      lines.push(`  port ${child.name}`);
      continue;
    }

    if (child.elementType === "artifact") {
      lines.push(`  artifact ${child.name}`);
    }
  }

  return lines;
}

function printTopLevelComponents(model: UmlModel): string[] {
  const lines: string[] = [];
  const components = model.elements.filter(
    (element) => element.elementType === "component" && element.parentId === undefined,
  );

  for (const component of components) {
    lines.push("");
    const body = printComponentBody(model, component.id);
    if (body.length === 0) {
      lines.push(`component ${component.name}`);
      continue;
    }
    lines.push(`component ${component.name} {`);
    lines.push(...body);
    lines.push("}");
  }

  return lines;
}

function printRelationship(model: UmlModel, relationship: UmlRelationship): string | undefined {
  if (relationship.relationshipType === "assemblyConnector") {
    const source = model.elements.find((element) => element.id === relationship.sourceId);
    const target = model.elements.find((element) => element.id === relationship.targetId);
    const sourceOwner = owningComponent(model, source);
    const targetOwner = owningComponent(model, target);
    if (source === undefined || target === undefined || sourceOwner === undefined || targetOwner === undefined) {
      return undefined;
    }
    return `${sourceOwner.name} required ${source.name} -- provided ${target.name} ${targetOwner.name}`;
  }

  if (relationship.relationshipType === "dependency") {
    const source = model.elements.find((element) => element.id === relationship.sourceId);
    const target = model.elements.find((element) => element.id === relationship.targetId);
    if (source === undefined || target === undefined) {
      return undefined;
    }
    return `${source.name} ..> ${target.name}`;
  }

  if (relationship.relationshipType === "delegationConnector") {
    const source = model.elements.find((element) => element.id === relationship.sourceId);
    const target = model.elements.find((element) => element.id === relationship.targetId);
    if (source === undefined || target === undefined) {
      return undefined;
    }
    return `${source.name} -- ${target.name}`;
  }

  return undefined;
}

export function printComponent(model: UmlModel, options?: { name?: string }): string {
  const lines: string[] = ["diagram component"];
  if (options?.name !== undefined) {
    lines[0] = `diagram component ${options.name}`;
  }

  lines.push(...printTopLevelComponents(model));

  const printable = model.relationships
    .map((relationship) => printRelationship(model, relationship))
    .filter((line): line is string => line !== undefined);

  if (printable.length > 0) {
    lines.push("");
    lines.push(...printable);
  }

  return `${lines.join("\n")}\n`;
}

export function structuralComponentModel(model: UmlModel) {
  const nameById = new Map(model.elements.map((element) => [element.id, element.name]));

  return {
    kind: model.kind,
    components: model.elements
      .filter((element) => element.elementType === "component")
      .map((element) => ({
        name: element.name,
        provides: model.relationships
          .filter(
            (relationship) =>
              relationship.relationshipType === "interfaceRealization" &&
              relationship.sourceId === element.id,
          )
          .map((relationship) => nameById.get(relationship.targetId)),
        requires: model.relationships
          .filter(
            (relationship) =>
              relationship.relationshipType === "usage" && relationship.sourceId === element.id,
          )
          .map((relationship) => nameById.get(relationship.targetId)),
      })),
    children: model.elements
      .filter((element) => element.parentId !== undefined)
      .map((element) => ({
        name: element.name,
        elementType: element.elementType,
        parentName: nameById.get(element.parentId ?? ""),
      })),
    relationships: model.relationships.map((relationship) => {
      const source = model.elements.find((element) => element.id === relationship.sourceId);
      const target = model.elements.find((element) => element.id === relationship.targetId);
      return {
        relationshipType: relationship.relationshipType,
        sourceName: nameById.get(relationship.sourceId),
        targetName: nameById.get(relationship.targetId),
        sourceParent: owningComponent(model, source)?.name,
        targetParent: owningComponent(model, target)?.name,
      };
    }),
  };
}

export type StructuralComponentModel = ReturnType<typeof structuralComponentModel>;
