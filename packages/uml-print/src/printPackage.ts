import { assertNever } from "@graphiq/uml-core";
import type { UmlElement, UmlModel, UmlRelationship } from "@graphiq/uml-model";

type PackagePrintableRelationship = UmlRelationship & {
  relationshipType: "packageImport" | "packageMerge" | "dependency";
};

function isPrintableRelationship(
  relationship: UmlRelationship,
): relationship is PackagePrintableRelationship {
  return (
    relationship.relationshipType === "packageImport" ||
    relationship.relationshipType === "packageMerge" ||
    relationship.relationshipType === "dependency"
  );
}

function isPackageElement(element: UmlElement): boolean {
  return element.elementType === "package";
}

function isNestedClassifier(element: UmlElement): boolean {
  return (
    element.elementType === "class" ||
    element.elementType === "interface" ||
    element.elementType === "enumeration"
  );
}

function printClassifier(element: UmlElement): string {
  switch (element.elementType) {
    case "class":
      return element.isAbstract ? `abstract class ${element.name}` : `class ${element.name}`;
    case "interface":
      return `interface ${element.name}`;
    case "enumeration":
      return `enum ${element.name}`;
    default:
      return `class ${element.name}`;
  }
}

function printPackageBody(model: UmlModel, packageId: string, indent: string): string[] {
  const lines: string[] = [];
  const children = model.elements.filter((element) => element.parentId === packageId);

  for (const child of children) {
    if (isPackageElement(child)) {
      lines.push(`${indent}package ${child.name} {`);
      lines.push(...printPackageBody(model, child.id, `${indent}  `));
      lines.push(`${indent}}`);
      continue;
    }

    if (isNestedClassifier(child)) {
      lines.push(`${indent}${printClassifier(child)}`);
    }
  }

  return lines;
}

function printTopLevelPackages(model: UmlModel): string[] {
  const lines: string[] = [];
  const packages = model.elements.filter(
    (element) => element.elementType === "package" && element.parentId === undefined,
  );

  for (const pkg of packages) {
    lines.push("");
    lines.push(`package ${pkg.name} {`);
    lines.push(...printPackageBody(model, pkg.id, "  "));
    lines.push("}");
  }

  return lines;
}

function printRelationshipLabel(relationshipType: PackagePrintableRelationship["relationshipType"]): string {
  switch (relationshipType) {
    case "packageImport":
      return "«import»";
    case "packageMerge":
      return "«merge»";
    case "dependency":
      return "";
    default:
      return assertNever(relationshipType);
  }
}

function printRelationship(
  relationship: PackagePrintableRelationship,
  nameById: ReadonlyMap<string, string>,
): string {
  const sourceName = nameById.get(relationship.sourceId);
  const targetName = nameById.get(relationship.targetId);
  if (sourceName === undefined || targetName === undefined) {
    throw new Error("Relationship endpoints must reference printable elements");
  }

  const label = printRelationshipLabel(relationship.relationshipType);
  return label.length > 0
    ? `${sourceName} ..> ${targetName} : ${label}`
    : `${sourceName} ..> ${targetName}`;
}

export function printPackage(model: UmlModel, options?: { name?: string }): string {
  const lines: string[] = ["diagram package"];
  if (options?.name !== undefined) {
    lines[0] = `diagram package ${options.name}`;
  }

  lines.push(...printTopLevelPackages(model));

  const nameById = new Map(model.elements.map((element) => [element.id, element.name]));
  const relationships = model.relationships.filter(isPrintableRelationship);

  if (relationships.length > 0) {
    lines.push("");
    for (const relationship of relationships) {
      lines.push(printRelationship(relationship, nameById));
    }
  }

  return `${lines.join("\n")}\n`;
}

export function structuralPackageModel(model: UmlModel) {
  return {
    kind: model.kind,
    packages: model.elements
      .filter(isPackageElement)
      .map((element) => ({
        name: element.name,
        parentName: element.parentId
          ? model.elements.find((item) => item.id === element.parentId)?.name
          : undefined,
      })),
    classifiers: model.elements
      .filter(isNestedClassifier)
      .map((element) => ({
        name: element.name,
        elementType: element.elementType,
        parentName: element.parentId
          ? model.elements.find((item) => item.id === element.parentId)?.name
          : undefined,
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
        },
      ];
    }),
  };
}

export type StructuralPackageModel = ReturnType<typeof structuralPackageModel>;
