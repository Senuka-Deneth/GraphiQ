import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parse } from "@graphiq/uml-dsl";
import { astToModel } from "./astToModel.js";
import { print } from "./print.js";
import { structuralProfileModel } from "./printProfile.js";

const fixtureDir = dirname(fileURLToPath(import.meta.url));
const javaFixture = readFileSync(
  join(fixtureDir, "../../uml-dsl/src/fixtures/profile-java.dsl"),
  "utf8",
);

describe("print profile diagram", () => {
  it("round-trips the section 5.7 fixture including tagged values and without coordinates", () => {
    const initialParse = parse("profile", javaFixture);
    expect(initialParse.ok).toBe(true);
    if (!initialParse.ok) {
      throw new Error("expected initial parse to succeed");
    }

    const initialModel = astToModel(initialParse.value.ast);
    const printed = print("profile", initialModel, { name: "JavaProfile" });
    expect(JSON.stringify(printed)).not.toMatch(/"x"|"y"|"width"|"height"/);
    expect(printed).toContain("table: String");

    const reparsed = parse("profile", printed);
    expect(reparsed.ok).toBe(true);
    if (!reparsed.ok) {
      throw new Error("expected reparsed print to succeed");
    }

    const reparsedModel = astToModel(reparsed.value.ast, initialModel);
    expect(structuralProfileModel(reparsedModel)).toEqual(structuralProfileModel(initialModel));
  });
});
