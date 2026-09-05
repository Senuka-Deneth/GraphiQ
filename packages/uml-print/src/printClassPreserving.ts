import { assertNever } from "@graphiq/uml-core";
import type {
  AstClassifier,
  ClassDiagramAst,
  ClassSourceClassifierChunk,
  ClassSourceRelationshipChunk,
  DiagramAst,
  DslComment,
  DslSpan,
} from "@graphiq/uml-dsl";
import { buildClassSourceMap } from "@graphiq/uml-dsl";
import type {
  Attribute,
  Operation,
  UmlModel,
  UmlRelationship,
} from "@graphiq/uml-model";
import {
  printClassCanonical,
  printPrintableElement,
  printRelationship,
  isClassPrintableRelationship,
  shouldPrintElement,
  type PrintableElement,
  type ClassPrintableRelationship,
} from "./printClassCanonical.js";

export type PrintSource = {
  text: string;
  ast: DiagramAst;
  comments: readonly DslComment[];
};

type ClassifierMatch = {
  astIndex: number;
  elementId: string;
  renamedFrom?: string;
};

type RelationshipMatch = {
  astIndex: number;
  relationshipId: string;
};

function classifierKindKey(
  kind: AstClassifier["classifierKind"],
  name: string,
  isAbstract = false,
): string {
  if (kind === "class") {
    return `class:${isAbstract ? "abstract" : "concrete"}:${name}`;
  }
  return `${kind}:${name}`;
}

function elementKindKey(element: PrintableElement): string {
  switch (element.elementType) {
    case "class":
      return classifierKindKey("class", element.name, element.isAbstract);
    case "interface":
      return classifierKindKey("interface", element.name);
    case "enumeration":
      return classifierKindKey("enumeration", element.name);
    case "dataType":
    case "primitiveType":
    case "associationClass":
      return classifierKindKey("class", element.name, false);
    default:
      return assertNever(element);
  }
}

function astClassifierKey(classifier: AstClassifier): string {
  if (classifier.classifierKind === "class") {
    return classifierKindKey("class", classifier.name, classifier.isAbstract);
  }
  return classifierKindKey(classifier.classifierKind, classifier.name);
}

function attributesEqual(
  left: readonly { visibility: string; name: string; typeName: string; multiplicity?: string; defaultValue?: string }[],
  right: readonly Attribute[],
): boolean {
  if (left.length !== right.length) {
    return false;
  }
  return left.every((attribute, index) => {
    const other = right[index];
    if (!other) {
      return false;
    }
    return (
      attribute.visibility === other.visibility &&
      attribute.name === other.name &&
      attribute.typeName === other.typeName &&
      attribute.multiplicity === other.multiplicity &&
      attribute.defaultValue === other.defaultValue
    );
  });
}

function operationsEqual(
  left: readonly {
    visibility: string;
    name: string;
    parameters: readonly { name: string; typeName: string }[];
    returnType?: string;
  }[],
  right: readonly Operation[],
): boolean {
  if (left.length !== right.length) {
    return false;
  }
  return left.every((operation, index) => {
    const other = right[index];
    if (!other) {
      return false;
    }
    return (
      operation.visibility === other.visibility &&
      operation.name === other.name &&
      operation.returnType === other.returnType &&
      operation.parameters.length === other.parameters.length &&
      operation.parameters.every((parameter, parameterIndex) => {
        const otherParameter = other.parameters[parameterIndex];
        return (
          otherParameter !== undefined &&
          parameter.name === otherParameter.name &&
          parameter.typeName === otherParameter.typeName
        );
      })
    );
  });
}

function classifierMembersEqual(classifier: AstClassifier, element: PrintableElement): boolean {
  switch (classifier.classifierKind) {
    case "class":
      if (element.elementType !== "class" && element.elementType !== "associationClass") {
        return false;
      }
      if (element.elementType === "class" && classifier.isAbstract !== element.isAbstract) {
        return false;
      }
      return (
        attributesEqual(classifier.attributes, element.attributes) &&
        operationsEqual(classifier.operations, element.operations)
      );
    case "interface":
      if (element.elementType !== "interface") {
        return false;
      }
      return (
        attributesEqual(classifier.attributes, element.attributes) &&
        operationsEqual(classifier.operations, element.operations)
      );
    case "enumeration":
      if (element.elementType !== "enumeration") {
        return false;
      }
      return (
        classifier.literals.length === element.literals.length &&
        classifier.literals.every((literal, index) => literal === element.literals[index])
      );
    default:
      return assertNever(classifier);
  }
}

function replaceSpan(text: string, span: DslSpan, replacement: string, baseOffset = 0): string {
  const start = span.start - baseOffset;
  const end = span.end - baseOffset;
  return `${text.slice(0, start)}${replacement}${text.slice(end)}`;
}

function emitRenamedText(
  text: string,
  baseOffset: number,
  span: DslSpan,
  replacement: string,
): string {
  return replaceSpan(text, span, replacement, baseOffset);
}

function emitClassifierChunk(
  chunk: ClassSourceClassifierChunk,
  element: PrintableElement,
  renamedFrom?: string,
): string {
  const classifier = chunk.classifier;
  const membersChanged = !classifierMembersEqual(classifier, element);

  if (membersChanged) {
    const prefixEnd = chunk.fullText.indexOf(chunk.declarationText);
    const prefix = prefixEnd >= 0 ? chunk.fullText.slice(0, prefixEnd) : "";
    const suffixStart = prefixEnd >= 0 ? prefixEnd + chunk.declarationText.length : chunk.fullText.length;
    const suffix = prefixEnd >= 0 ? chunk.fullText.slice(suffixStart) : "";
    return `${prefix}${printPrintableElement(element)}${suffix}`;
  }

  let output = chunk.fullText;
  const baseOffset = chunk.fullSpan.start;
  if (renamedFrom !== undefined && renamedFrom !== element.name) {
    output = emitRenamedText(output, baseOffset, classifier.nameSpan, element.name);
  }
  return output;
}

function relationshipStructuralKey(
  sourceName: string,
  targetName: string,
  relationshipType: string,
  sourceMultiplicity?: string,
  targetMultiplicity?: string,
  name?: string,
): string {
  return [
    sourceName,
    targetName,
    relationshipType,
    sourceMultiplicity ?? "",
    targetMultiplicity ?? "",
    name ?? "",
  ].join("|");
}

function modelRelationshipKey(
  relationship: UmlRelationship,
  nameById: ReadonlyMap<string, string>,
): string | undefined {
  const sourceName = nameById.get(relationship.sourceId);
  const targetName = nameById.get(relationship.targetId);
  if (sourceName === undefined || targetName === undefined) {
    return undefined;
  }
  if (!isClassPrintableRelationship(relationship)) {
    return undefined;
  }
  const sourceMultiplicity =
    "sourceMultiplicity" in relationship ? relationship.sourceMultiplicity : undefined;
  const targetMultiplicity =
    "targetMultiplicity" in relationship ? relationship.targetMultiplicity : undefined;
  return relationshipStructuralKey(
    sourceName,
    targetName,
    relationship.relationshipType,
    sourceMultiplicity,
    targetMultiplicity,
    relationship.name,
  );
}

function emitRelationshipChunk(
  chunk: ClassSourceRelationshipChunk,
  relationship: ClassPrintableRelationship,
  nameById: ReadonlyMap<string, string>,
  renameMap: ReadonlyMap<string, string>,
): string {
  const astRelationship = chunk.relationship;
  const sourceName = nameById.get(relationship.sourceId);
  const targetName = nameById.get(relationship.targetId);
  if (sourceName === undefined || targetName === undefined) {
    return printRelationship(relationship, nameById);
  }

  const unchanged =
    astRelationship.sourceName === sourceName &&
    astRelationship.targetName === targetName &&
    astRelationship.relationshipType === relationship.relationshipType &&
    astRelationship.name === relationship.name;

  if (!unchanged) {
    const prefixEnd = chunk.fullText.indexOf(chunk.declarationText);
    const prefix = prefixEnd >= 0 ? chunk.fullText.slice(0, prefixEnd) : "";
    const suffixStart = prefixEnd >= 0 ? prefixEnd + chunk.declarationText.length : chunk.fullText.length;
    const suffix = prefixEnd >= 0 ? chunk.fullText.slice(suffixStart) : "";
    return `${prefix}${printRelationship(relationship, nameById)}${suffix}`;
  }

  let output = chunk.fullText;
  const baseOffset = chunk.fullSpan.start;
  const renamedSource = renameMap.get(astRelationship.sourceName);
  if (renamedSource !== undefined) {
    output = emitRenamedText(output, baseOffset, astRelationship.sourceNameSpan, renamedSource);
  }
  const renamedTarget = renameMap.get(astRelationship.targetName);
  if (renamedTarget !== undefined) {
    output = emitRenamedText(output, baseOffset, astRelationship.targetNameSpan, renamedTarget);
  }
  return output;
}

function matchClassifiers(
  ast: ClassDiagramAst,
  elements: readonly PrintableElement[],
): { matches: ClassifierMatch[]; ambiguous: boolean } {
  const matches: ClassifierMatch[] = [];
  const unmatchedAst = new Set(ast.classifiers.map((_, index) => index));
  const unmatchedElements = new Set(elements.map((element) => element.id));

  for (const element of elements) {
    const key = elementKindKey(element);
    const astIndex = ast.classifiers.findIndex(
      (classifier, index) => unmatchedAst.has(index) && astClassifierKey(classifier) === key,
    );
    if (astIndex === -1) {
      continue;
    }
    unmatchedAst.delete(astIndex);
    unmatchedElements.delete(element.id);
    matches.push({ astIndex, elementId: element.id });
  }

  type KindBucket = "class-concrete" | "class-abstract" | "interface" | "enumeration";
  function bucketForClassifier(classifier: AstClassifier): KindBucket {
    if (classifier.classifierKind === "class") {
      return classifier.isAbstract ? "class-abstract" : "class-concrete";
    }
    return classifier.classifierKind;
  }
  function bucketForElement(element: PrintableElement): KindBucket {
    if (element.elementType === "class" || element.elementType === "associationClass") {
      return element.elementType === "class" && element.isAbstract ? "class-abstract" : "class-concrete";
    }
    if (element.elementType === "interface") {
      return "interface";
    }
    return "enumeration";
  }

  const astByBucket = new Map<KindBucket, number[]>();
  for (const astIndex of unmatchedAst) {
    const classifier = ast.classifiers[astIndex];
    if (classifier === undefined) {
      continue;
    }
    const bucket = bucketForClassifier(classifier);
    const list = astByBucket.get(bucket) ?? [];
    list.push(astIndex);
    astByBucket.set(bucket, list);
  }

  const elementByBucket = new Map<KindBucket, PrintableElement[]>();
  for (const element of elements) {
    if (!unmatchedElements.has(element.id)) {
      continue;
    }
    const bucket = bucketForElement(element);
    const list = elementByBucket.get(bucket) ?? [];
    list.push(element);
    elementByBucket.set(bucket, list);
  }

  for (const [bucket, astIndices] of astByBucket) {
    const elementList = elementByBucket.get(bucket) ?? [];
    if (astIndices.length !== elementList.length) {
      return { matches, ambiguous: true };
    }
    if (astIndices.length === 0) {
      continue;
    }
    if (astIndices.length > 1) {
      return { matches, ambiguous: true };
    }
    const astIndex = astIndices[0];
    const element = elementList[0];
    if (astIndex === undefined || element === undefined) {
      return { matches, ambiguous: true };
    }
    const classifier = ast.classifiers[astIndex];
    if (classifier === undefined) {
      return { matches, ambiguous: true };
    }
    matches.push({
      astIndex,
      elementId: element.id,
      renamedFrom: classifier.name,
    });
    unmatchedAst.delete(astIndex);
    unmatchedElements.delete(element.id);
  }

  if (unmatchedAst.size > 0 && unmatchedElements.size > 0) {
    return { matches, ambiguous: true };
  }

  return { matches, ambiguous: false };
}

function matchRelationships(
  ast: ClassDiagramAst,
  relationships: readonly UmlRelationship[],
  nameById: ReadonlyMap<string, string>,
  renameMap: ReadonlyMap<string, string>,
): { matches: RelationshipMatch[]; ambiguous: boolean } {
  const matches: RelationshipMatch[] = [];
  const unmatchedAst = new Set(ast.relationships.map((_, index) => index));
  const unmatchedRelationships = new Set(relationships.map((relationship) => relationship.id));

  for (const relationship of relationships) {
    const key = modelRelationshipKey(relationship, nameById);
    if (key === undefined) {
      continue;
    }
    const astIndex = ast.relationships.findIndex((astRelationship, index) => {
      if (!unmatchedAst.has(index)) {
        return false;
      }
      const sourceName = renameMap.get(astRelationship.sourceName) ?? astRelationship.sourceName;
      const targetName = renameMap.get(astRelationship.targetName) ?? astRelationship.targetName;
      return (
        relationshipStructuralKey(
          sourceName,
          targetName,
          astRelationship.relationshipType,
          astRelationship.sourceMultiplicity,
          astRelationship.targetMultiplicity,
          astRelationship.name,
        ) === key
      );
    });
    if (astIndex === -1) {
      continue;
    }
    unmatchedAst.delete(astIndex);
    unmatchedRelationships.delete(relationship.id);
    matches.push({ astIndex, relationshipId: relationship.id });
  }

  if (unmatchedAst.size > 0 && unmatchedRelationships.size > 0) {
    return { matches, ambiguous: true };
  }

  return { matches, ambiguous: false };
}

function updateHeaderName(headerText: string, ast: ClassDiagramAst, name?: string): string {
  if (name === undefined || name === ast.name) {
    return headerText;
  }
  const headerLine = ast.name !== undefined ? `diagram class ${ast.name}` : "diagram class";
  const replacement = `diagram class ${name}`;
  const headerLineIndex = headerText.indexOf(headerLine);
  if (headerLineIndex === -1) {
    return headerText.replace(/diagram\s+class(?:\s+[^\n\r]+)?/, replacement);
  }
  return `${headerText.slice(0, headerLineIndex)}${replacement}${headerText.slice(headerLineIndex + headerLine.length)}`;
}

export function printClassPreserving(
  model: UmlModel,
  source: PrintSource,
  options?: { name?: string },
): string {
  if (source.ast.kind !== "class") {
    return printClassCanonical(model, options);
  }
  const classAst = source.ast;
  const sourceMap = buildClassSourceMap(source.text, classAst, source.comments);
  const printableElements = model.elements.filter(shouldPrintElement);
  const classifierMatching = matchClassifiers(classAst, printableElements);
  if (classifierMatching.ambiguous) {
    return printClassCanonical(model, options);
  }

  const elementById = new Map(printableElements.map((element) => [element.id, element]));
  const chunkByAstIndex = new Map(
    sourceMap.classifiers.map((chunk) => [chunk.index, chunk]),
  );
  const renameMap = new Map<string, string>();
  for (const match of classifierMatching.matches) {
    if (match.renamedFrom !== undefined) {
      const element = elementById.get(match.elementId);
      if (element !== undefined) {
        renameMap.set(match.renamedFrom, element.name);
      }
    }
  }

  const nameById = new Map(model.elements.map((element) => [element.id, element.name]));
  const printableRelationships = model.relationships.filter(isClassPrintableRelationship);
  const relationshipMatching = matchRelationships(
    classAst,
    printableRelationships,
    nameById,
    renameMap,
  );
  if (relationshipMatching.ambiguous) {
    return printClassCanonical(model, options);
  }

  const relationshipChunkByAstIndex = new Map(
    sourceMap.relationships.map((chunk) => [chunk.index, chunk]),
  );

  const parts: string[] = [updateHeaderName(sourceMap.headerText, classAst, options?.name)];

  const matchByElementId = new Map(
    classifierMatching.matches.map((match) => [match.elementId, match]),
  );

  for (const element of printableElements) {
    const match = matchByElementId.get(element.id);
    if (match === undefined) {
      parts.push(`\n\n${printPrintableElement(element)}`);
      continue;
    }
    const chunk = chunkByAstIndex.get(match.astIndex);
    if (chunk === undefined) {
      parts.push(`\n\n${printPrintableElement(element)}`);
      continue;
    }
    parts.push(emitClassifierChunk(chunk, element, match.renamedFrom));
  }

  const relationshipMatchById = new Map(
    relationshipMatching.matches.map((match) => [match.relationshipId, match]),
  );

  let relationshipsStarted = false;
  for (const relationship of printableRelationships) {
    const match = relationshipMatchById.get(relationship.id);
    if (match === undefined) {
      parts.push(
        `${relationshipsStarted ? "\n" : "\n\n"}${printRelationship(relationship, nameById)}`,
      );
      relationshipsStarted = true;
      continue;
    }
    const chunk = relationshipChunkByAstIndex.get(match.astIndex);
    if (chunk === undefined) {
      parts.push(
        `${relationshipsStarted ? "\n" : "\n\n"}${printRelationship(relationship, nameById)}`,
      );
      relationshipsStarted = true;
      continue;
    }
    parts.push(
      `${relationshipsStarted ? "\n" : "\n\n"}${emitRelationshipChunk(chunk, relationship, nameById, renameMap)}`,
    );
    relationshipsStarted = true;
  }

  if (sourceMap.trailerText.length > 0) {
    parts.push(sourceMap.trailerText);
  }

  const body = parts.join("");
  return body.endsWith("\n") ? body : `${body}\n`;
}
