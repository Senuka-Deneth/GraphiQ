import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parse } from "@graphiq/uml-dsl";
import { astToModel } from "./astToModel.js";
import { print } from "./print.js";
import { structuralCompositeStructureModel } from "./printCompositeStructure.js";

const fixtureDir = dirname(fileURLToPath(import.meta.url));
const carFixture = readFileSync(
  join(fixtureDir, "../../uml-dsl/src/fixtures/compositeStructure-car.dsl"),
  "utf8",
);

describe("print composite structure diagram", () => {
  it("round-trips the section 5.4 fixture without coordinates", () => {
    const initialParse = parse("compositeStructure", carFixture);
    expect(initialParse.ok).toBe(true);
    if (!initialParse.ok) {
      throw new Error("expected initial parse to succeed");
    }

    const initialModel = astToModel(initialParse.value.ast);
    const printed = print("compositeStructure", initialModel, { name: "CarInternals" });
    expect(JSON.stringify(printed)).not.toMatch(/"x"|"y"|"width"|"height"/);
    expect(printed).toContain("part engine: Engine");
    expect(printed).toContain("connector c1 : engine.power to power");

    const reparsed = parse("compositeStructure", printed);
    expect(reparsed.ok).toBe(true);
    if (!reparsed.ok) {
      throw new Error("expected reparsed print to succeed");
    }

    const reparsedModel = astToModel(reparsed.value.ast, initialModel);
    expect(structuralCompositeStructureModel(reparsedModel)).toEqual(
      structuralCompositeStructureModel(initialModel),
    );
  });
});
