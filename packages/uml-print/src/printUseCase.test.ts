import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parse } from "@graphiq/uml-dsl";
import { astToModel } from "./astToModel.js";
import { print } from "./print.js";
import { structuralUseCaseModel } from "./printUseCase.js";

const fixtureDir = dirname(fileURLToPath(import.meta.url));
const storefrontFixture = readFileSync(
  join(fixtureDir, "../../uml-dsl/src/fixtures/usecase-storefront.dsl"),
  "utf8",
);

describe("print use case diagram", () => {
  it("round-trips the section 5.8 fixture without coordinates", () => {
    const initialParse = parse("useCase", storefrontFixture);
    expect(initialParse.ok).toBe(true);
    if (!initialParse.ok) {
      throw new Error("expected initial parse to succeed");
    }

    const initialModel = astToModel(initialParse.value.ast);
    const printed = print("useCase", initialModel, { name: "Storefront" });
    expect(JSON.stringify(printed)).not.toMatch(/"x"|"y"|"width"|"height"/);
    expect(printed).toContain("«include»");
    expect(printed).toContain("«extend»");

    const reparsed = parse("useCase", printed);
    expect(reparsed.ok).toBe(true);
    if (!reparsed.ok) {
      throw new Error("expected reparsed print to succeed");
    }

    const reparsedModel = astToModel(reparsed.value.ast, initialModel);
    expect(structuralUseCaseModel(reparsedModel)).toEqual(structuralUseCaseModel(initialModel));
  });
});
