import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parse } from "@graphiq/uml-dsl";
import { astToModel } from "./astToModel.js";
import { print } from "./print.js";
import { structuralCommunicationModel } from "./printCommunication.js";

const fixtureDir = dirname(fileURLToPath(import.meta.url));
const checkoutFixture = readFileSync(
  join(fixtureDir, "../../uml-dsl/src/fixtures/communication-checkout.dsl"),
  "utf8",
);

describe("print communication diagram", () => {
  it("round-trips the section 5.12 fixture without coordinates", () => {
    const initialParse = parse("communication", checkoutFixture);
    expect(initialParse.ok).toBe(true);
    if (!initialParse.ok) {
      throw new Error("expected initial parse to succeed");
    }

    const initialModel = astToModel(initialParse.value.ast);
    const printed = print("communication", initialModel, { name: "CheckoutComm" });
    expect(JSON.stringify(printed)).not.toMatch(/"x"|"y"|"width"|"height"/);
    expect(printed).toContain("1: placeOrder()");
    expect(printed).toContain("2: confirm()");

    const reparsed = parse("communication", printed);
    expect(reparsed.ok).toBe(true);
    if (!reparsed.ok) {
      throw new Error("expected reparsed print to succeed");
    }

    const reparsedModel = astToModel(reparsed.value.ast, initialModel);
    expect(structuralCommunicationModel(reparsedModel)).toEqual(
      structuralCommunicationModel(initialModel),
    );
  });
});
