import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { DIAGRAM_KINDS } from "@graphiq/uml-core";
import { parse } from "@graphiq/uml-dsl";
import { classAstToModel } from "./classAstToModel.js";
import { print } from "./print.js";

const fixtureDir = dirname(fileURLToPath(import.meta.url));
const orderDomainFixture = readFileSync(
  join(fixtureDir, "../../uml-dsl/src/fixtures/class-order-domain.dsl"),
  "utf8",
);

type StructuralModel = {
  kind: string;
  elements: readonly {
    name: string;
    elementType: string;
    isAbstract?: boolean;
    attributes: readonly { visibility: string; name: string; typeName: string; multiplicity?: string; defaultValue?: string }[];
    operations: readonly {
      visibility: string;
      name: string;
      parameters: readonly { name: string; typeName: string }[];
      returnType?: string;
    }[];
    literals?: readonly string[];
  }[];
  relationships: readonly {
    sourceName: string;
    targetName: string;
    relationshipType: string;
    sourceMultiplicity?: string;
    targetMultiplicity?: string;
    name?: string;
  }[];
};

function modelToStructural(model: ReturnType<typeof classAstToModel>): StructuralModel {
  const nameById = new Map(model.elements.map((element) => [element.id, element.name]));

  return {
    kind: model.kind,
    elements: model.elements
      .filter(
        (element) =>
          element.elementType === "class" ||
          element.elementType === "interface" ||
          element.elementType === "enumeration",
      )
      .map((element) => {
        if (element.elementType === "enumeration") {
          return {
            name: element.name,
            elementType: element.elementType,
            attributes: [],
            operations: [],
            literals: [...element.literals],
          };
        }
        if (element.elementType === "class") {
          return {
            name: element.name,
            elementType: element.elementType,
            isAbstract: element.isAbstract,
            attributes: element.attributes.map((attribute) => ({
              visibility: attribute.visibility,
              name: attribute.name,
              typeName: attribute.typeName,
              multiplicity: attribute.multiplicity,
              defaultValue: attribute.defaultValue,
            })),
            operations: element.operations.map((operation) => ({
              visibility: operation.visibility,
              name: operation.name,
              parameters: operation.parameters.map((parameter) => ({
                name: parameter.name,
                typeName: parameter.typeName,
              })),
              returnType: operation.returnType,
            })),
          };
        }
        return {
          name: element.name,
          elementType: element.elementType,
          attributes: element.attributes.map((attribute) => ({
            visibility: attribute.visibility,
            name: attribute.name,
            typeName: attribute.typeName,
            multiplicity: attribute.multiplicity,
            defaultValue: attribute.defaultValue,
          })),
          operations: element.operations.map((operation) => ({
            visibility: operation.visibility,
            name: operation.name,
            parameters: operation.parameters.map((parameter) => ({
              name: parameter.name,
              typeName: parameter.typeName,
            })),
            returnType: operation.returnType,
          })),
        };
      }),
    relationships: model.relationships.map((relationship) => ({
      sourceName: nameById.get(relationship.sourceId) ?? relationship.sourceId,
      targetName: nameById.get(relationship.targetId) ?? relationship.targetId,
      relationshipType: relationship.relationshipType,
      sourceMultiplicity:
        "sourceMultiplicity" in relationship ? relationship.sourceMultiplicity : undefined,
      targetMultiplicity:
        "targetMultiplicity" in relationship ? relationship.targetMultiplicity : undefined,
      name: relationship.name,
    })),
  };
}

describe("print class diagram", () => {
  it("round-trips the section 5.1 fixture without coordinates", () => {
    const initialParse = parse("class", orderDomainFixture);
    expect(initialParse.ok).toBe(true);
    if (!initialParse.ok) {
      throw new Error("expected initial parse to succeed");
    }

    const initialAst = initialParse.value.ast;
    if (initialAst.kind !== "class") {
      throw new Error("expected class ast");
    }
    const initialModel = classAstToModel(initialAst);
    const printed = print("class", initialModel, { name: "OrderDomain" });
    expect(JSON.stringify(printed)).not.toMatch(/"x"|"y"|"width"|"height"/);

    const reparsed = parse("class", printed);
    expect(reparsed.ok).toBe(true);
    if (!reparsed.ok) {
      throw new Error("expected reparsed print to succeed");
    }

    const reparsedAst = reparsed.value.ast;
    if (reparsedAst.kind !== "class") {
      throw new Error("expected class ast");
    }
    const reparsedModel = classAstToModel(reparsedAst);
    expect(modelToStructural(reparsedModel)).toEqual(
      modelToStructural(initialModel),
    );
  });

  it("preserves element ids when applying the same AST twice", () => {
    const initialParse = parse("class", orderDomainFixture);
    expect(initialParse.ok).toBe(true);
    if (!initialParse.ok) {
      throw new Error("expected initial parse to succeed");
    }

    const ast = initialParse.value.ast;
    if (ast.kind !== "class") {
      throw new Error("expected class ast");
    }

    const firstModel = classAstToModel(ast);
    const secondModel = classAstToModel(ast, firstModel);

    expect(secondModel.elements.map((element) => element.id)).toEqual(
      firstModel.elements.map((element) => element.id),
    );
    expect(secondModel.relationships.map((relationship) => relationship.id)).toEqual(
      firstModel.relationships.map((relationship) => relationship.id),
    );
  });

  it("throws not implemented for non-class diagram kinds", () => {
    for (const kind of DIAGRAM_KINDS) {
      if (
        kind === "class" ||
        kind === "object" ||
        kind === "package" ||
        kind === "component" ||
        kind === "deployment" ||
        kind === "profile" ||
        kind === "useCase" ||
        kind === "compositeStructure"
      ) {
        continue;
      }
      const model = classAstToModel({
        kind: "class",
        classifiers: [],
        relationships: [],
        span: { start: 0, end: 0 },
      });
      expect(() => print(kind, model)).toThrow("not implemented");
    }
  });
});
