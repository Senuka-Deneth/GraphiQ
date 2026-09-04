import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parse } from "@graphiq/uml-dsl";
import { astToModel } from "./astToModel.js";
import { print } from "./print.js";
import { structuralPackageModel } from "./printPackage.js";

const fixtureDir = dirname(fileURLToPath(import.meta.url));
const systemFixture = readFileSync(
  join(fixtureDir, "../../uml-dsl/src/fixtures/package-system.dsl"),
  "utf8",
);

describe("print package diagram", () => {
  it("round-trips the section 5.3 fixture without coordinates", () => {
    const initialParse = parse("package", systemFixture);
    expect(initialParse.ok).toBe(true);
    if (!initialParse.ok) {
      throw new Error("expected initial parse to succeed");
    }

    const initialModel = astToModel(initialParse.value.ast);
    const printed = print("package", initialModel, { name: "System" });
    expect(JSON.stringify(printed)).not.toMatch(/"x"|"y"|"width"|"height"/);

    const reparsed = parse("package", printed);
    expect(reparsed.ok).toBe(true);
    if (!reparsed.ok) {
      throw new Error("expected reparsed print to succeed");
    }

    const reparsedModel = astToModel(reparsed.value.ast, initialModel);
    expect(structuralPackageModel(reparsedModel)).toEqual(
      structuralPackageModel(initialModel),
    );
  });
});
