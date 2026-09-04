import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parse } from "@graphiq/uml-dsl";
import { astToModel } from "./astToModel.js";
import { print } from "./print.js";
import { structuralDeploymentModel } from "./printDeployment.js";

const fixtureDir = dirname(fileURLToPath(import.meta.url));
const prodFixture = readFileSync(
  join(fixtureDir, "../../uml-dsl/src/fixtures/deployment-prod.dsl"),
  "utf8",
);

describe("print deployment diagram", () => {
  it("round-trips the section 5.6 fixture without coordinates", () => {
    const initialParse = parse("deployment", prodFixture);
    expect(initialParse.ok).toBe(true);
    if (!initialParse.ok) {
      throw new Error("expected initial parse to succeed");
    }

    const initialModel = astToModel(initialParse.value.ast);
    const printed = print("deployment", initialModel, { name: "Prod" });
    expect(JSON.stringify(printed)).not.toMatch(/"x"|"y"|"width"|"height"/);

    const reparsed = parse("deployment", printed);
    expect(reparsed.ok).toBe(true);
    if (!reparsed.ok) {
      throw new Error("expected reparsed print to succeed");
    }

    const reparsedModel = astToModel(reparsed.value.ast, initialModel);
    expect(structuralDeploymentModel(reparsedModel)).toEqual(
      structuralDeploymentModel(initialModel),
    );
  });
});
