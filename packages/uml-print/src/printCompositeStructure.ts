import type { PartElement, PortElement, UmlElement, UmlModel, UmlRelationship } from "@graphiq/uml-model";

function printQualifiedEnd(model: UmlModel, elementId: string): string | undefined {
  const element = model.elements.find((item) => item.id === elementId);
  if (element === undefined) {
    return undefined;
  }

  if (element.parentId === undefined) {
    return element.name;
  }

  const parent = model.elements.find((item) => item.id === element.parentId);
  if (parent === undefined) {
    return element.name;
  }

  if (element.elementType === "port" && parent.elementType === "part") {
    return `${parent.name}.${element.name}`;
  }

  return element.name;
}

function printBodyItem(element: UmlElement): string | undefined {
  if (element.elementType === "part") {
    const part = element as PartElement;
    const multiplicity =
      part.multiplicity !== undefined ? ` [${part.multiplicity}]` : "";
    return `  part ${part.name}: ${part.typeName}${multiplicity}`;
  }

  if (element.elementType === "port") {
    const port = element as PortElement;
    if (port.typeName !== undefined) {
      return `  port ${port.name}: ${port.typeName}`;
    }
    return `  port ${port.name}`;
  }

  return undefined;
}

function printFrame(model: UmlModel, frame: UmlElement): string[] {
  const keyword = frame.elementType === "class" ? "class" : "component";
  const children = model.elements.filter((element) => element.parentId === frame.id);
  const bodyLines = children
    .map((child) => printBodyItem(child))
    .filter((line): line is string => line !== undefined);

  const lines: string[] = [""];
  if (bodyLines.length === 0) {
    lines.push(`${keyword} ${frame.name} {}`);
    return lines;
  }

  lines.push(`${keyword} ${frame.name} {`);
  lines.push(...bodyLines);
  lines.push("}");
  return lines;
}

function printConnector(model: UmlModel, relationship: UmlRelationship): string | undefined {
  if (relationship.relationshipType !== "connector") {
    return undefined;
  }

  const source = printQualifiedEnd(model, relationship.sourceId);
  const target = printQualifiedEnd(model, relationship.targetId);
  if (source === undefined || target === undefined) {
    return undefined;
  }

  const name = relationship.name ?? "connector";
  return `connector ${name} : ${source} to ${target}`;
}

export function printCompositeStructure(model: UmlModel, options?: { name?: string }): string {
  const lines: string[] = ["diagram compositeStructure"];
  if (options?.name !== undefined) {
    lines[0] = `diagram compositeStructure ${options.name}`;
  }

  const frames = model.elements.filter(
    (element) =>
      (element.elementType === "class" || element.elementType === "component") &&
      element.parentId === undefined,
  );

  for (const frame of frames) {
    lines.push(...printFrame(model, frame));
  }

  const printable = model.relationships
    .map((relationship) => printConnector(model, relationship))
    .filter((line): line is string => line !== undefined);

  if (printable.length > 0) {
    lines.push("");
    lines.push(...printable);
  }

  return `${lines.join("\n")}\n`;
}

export function structuralCompositeStructureModel(model: UmlModel) {
  const nameById = new Map(model.elements.map((element) => [element.id, element.name]));

  return {
    kind: model.kind,
    elements: model.elements
      .filter((element) => element.elementType !== "note")
      .map((element) => ({
        name: element.name,
        elementType: element.elementType,
        parentName:
          element.parentId !== undefined ? nameById.get(element.parentId) : undefined,
        ...(element.elementType === "part"
          ? {
              typeName: element.typeName,
              multiplicity: element.multiplicity,
            }
          : {}),
        ...(element.elementType === "port" && element.typeName !== undefined
          ? { typeName: element.typeName }
          : {}),
      })),
    relationships: model.relationships.map((relationship) => ({
      relationshipType: relationship.relationshipType,
      name: relationship.name,
      sourceQualified: printQualifiedEnd(model, relationship.sourceId),
      targetQualified: printQualifiedEnd(model, relationship.targetId),
    })),
  };
}

export type StructuralCompositeStructureModel = ReturnType<
  typeof structuralCompositeStructureModel
>;
