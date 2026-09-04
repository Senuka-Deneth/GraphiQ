import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parse } from "@graphiq/uml-dsl";
import { astToModel } from "./astToModel.js";
import { print } from "./print.js";
import { structuralComponentModel } from "./printComponent.js";

const fixtureDir = dirname(fileURLToPath(import.meta.url));
const shopFixture = readFileSync(
  join(fixtureDir, "../../uml-dsl/src/fixtures/component-shop.dsl"),
  "utf8",
);

describe("print component diagram", () => {
  it("round-trips the section 5.5 fixture without coordinates", () => {
    const initialParse = parse("component", shopFixture);
    expect(initialParse.ok).toBe(true);
    if (!initialParse.ok) {
      throw new Error("expected initial parse to succeed");
    }

    const initialModel = astToModel(initialParse.value.ast);
    const printed = print("component", initialModel, { name: "Shop" });
    expect(JSON.stringify(printed)).not.toMatch(/"x"|"y"|"width"|"height"/);

    const reparsed = parse("component", printed);
    expect(reparsed.ok).toBe(true);
    if (!reparsed.ok) {
      throw new Error("expected reparsed print to succeed");
    }

    const reparsedModel = astToModel(reparsed.value.ast, initialModel);
    expect(structuralComponentModel(reparsedModel)).toEqual(
      structuralComponentModel(initialModel),
    );
  });
});
