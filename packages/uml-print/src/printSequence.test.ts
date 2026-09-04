import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parse } from "@graphiq/uml-dsl";
import { astToModel } from "./astToModel.js";
import { print } from "./print.js";
import { structuralSequenceModel } from "./printSequence.js";

const fixtureDir = dirname(fileURLToPath(import.meta.url));
const checkoutFixture = readFileSync(
  join(fixtureDir, "../../uml-dsl/src/fixtures/sequence-checkout.dsl"),
  "utf8",
);

describe("print sequence diagram", () => {
  it("round-trips the section 5.11 fixture without coordinates", () => {
    const initialParse = parse("sequence", checkoutFixture);
    expect(initialParse.ok).toBe(true);
    if (!initialParse.ok) {
      throw new Error("expected initial parse to succeed");
    }

    const initialModel = astToModel(initialParse.value.ast);
    const printed = print("sequence", initialModel, { name: "Checkout" });
    expect(JSON.stringify(printed)).not.toMatch(/"x"|"y"|"width"|"height"/);
    expect(printed).toContain("lifeline customer: Actor");
    expect(printed).toContain("customer -> shop : placeOrder()");
    expect(printed).toContain("pay -->> shop : ok");

    const reparsed = parse("sequence", printed);
    expect(reparsed.ok).toBe(true);
    if (!reparsed.ok) {
      throw new Error("expected reparsed print to succeed");
    }

    const reparsedModel = astToModel(reparsed.value.ast, initialModel);
    expect(structuralSequenceModel(reparsedModel)).toEqual(
      structuralSequenceModel(initialModel),
    );
  });
});
