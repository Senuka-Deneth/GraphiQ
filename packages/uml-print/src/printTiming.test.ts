import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parse } from "@graphiq/uml-dsl";
import { astToModel } from "./astToModel.js";
import { print } from "./print.js";
import { structuralTimingModel } from "./printTiming.js";

const fixtureDir = dirname(fileURLToPath(import.meta.url));
const lampFixture = readFileSync(
  join(fixtureDir, "../../uml-dsl/src/fixtures/timing-lamp.dsl"),
  "utf8",
);

describe("print timing diagram", () => {
  it("round-trips the section 5.13 fixture without coordinates", () => {
    const initialParse = parse("timing", lampFixture);
    expect(initialParse.ok).toBe(true);
    if (!initialParse.ok) {
      throw new Error("expected initial parse to succeed");
    }

    const initialModel = astToModel(initialParse.value.ast);
    const printed = print("timing", initialModel, { name: "Lamp" });
    expect(JSON.stringify(printed)).not.toMatch(/"x"|"y"|"width"|"height"/);
    expect(printed).toContain("lifeline lamp: Lamp");
    expect(printed).toContain("Off @ 0");
    expect(printed).toContain("On @ 10");
    expect(printed).toContain("Off @ 40");

    const reparsed = parse("timing", printed);
    expect(reparsed.ok).toBe(true);
    if (!reparsed.ok) {
      throw new Error("expected reparsed print to succeed");
    }

    const reparsedModel = astToModel(reparsed.value.ast, initialModel);
    expect(structuralTimingModel(reparsedModel)).toEqual(
      structuralTimingModel(initialModel),
    );
  });
});
