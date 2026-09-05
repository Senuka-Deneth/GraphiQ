import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parse } from "@graphiq/uml-dsl";
import { astToModel } from "./astToModel.js";
import { print } from "./print.js";
import { structuralActivityModel } from "./printActivity.js";

const fixtureDir = dirname(fileURLToPath(import.meta.url));
const fulfillOrderFixture = readFileSync(
  join(fixtureDir, "../../uml-dsl/src/fixtures/activity-fulfill-order.dsl"),
  "utf8",
);

describe("print activity diagram", () => {
  it("round-trips the section 5.9 fixture without coordinates", () => {
    const initialParse = parse("activity", fulfillOrderFixture);
    expect(initialParse.ok).toBe(true);
    if (!initialParse.ok) {
      throw new Error("expected initial parse to succeed");
    }

    const initialModel = astToModel(initialParse.value.ast);
    const printed = print("activity", initialModel, { name: "FulfillOrder" });
    expect(JSON.stringify(printed)).not.toMatch(/"x"|"y"|"width"|"height"/);
    expect(printed).toContain("partition Sales");
    expect(printed).toContain("action ReceiveOrder");
    expect(printed).toContain("initial --> ReceiveOrder");
    expect(printed).toContain("Ship --> final");

    const reparsed = parse("activity", printed);
    expect(reparsed.ok).toBe(true);
    if (!reparsed.ok) {
      throw new Error("expected reparsed print to succeed");
    }

    const reparsedModel = astToModel(reparsed.value.ast, initialModel);
    expect(structuralActivityModel(reparsedModel)).toEqual(
      structuralActivityModel(initialModel),
    );
  });
});
