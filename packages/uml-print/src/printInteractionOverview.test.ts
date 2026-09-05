import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parse } from "@graphiq/uml-dsl";
import { astToModel } from "./astToModel.js";
import { print } from "./print.js";
import { structuralInteractionOverviewModel } from "./printInteractionOverview.js";

const fixtureDir = dirname(fileURLToPath(import.meta.url));
const orderFlowFixture = readFileSync(
  join(fixtureDir, "../../uml-dsl/src/fixtures/interaction-overview-order-flow.dsl"),
  "utf8",
);

describe("print interaction overview diagram", () => {
  it("round-trips the section 5.14 fixture without coordinates", () => {
    const initialParse = parse("interactionOverview", orderFlowFixture);
    expect(initialParse.ok).toBe(true);
    if (!initialParse.ok) {
      throw new Error("expected initial parse to succeed");
    }

    const initialModel = astToModel(initialParse.value.ast);
    expect(initialModel.relationships.every((item) => item.relationshipType === "controlFlow")).toBe(
      true,
    );
    expect(initialModel.elements.map((element) => element.elementType).sort()).toEqual([
      "activityFinalNode",
      "initialNode",
      "interactionUse",
      "interactionUse",
    ]);

    const printed = print("interactionOverview", initialModel, { name: "OrderFlow" });
    expect(JSON.stringify(printed)).not.toMatch(/"x"|"y"|"width"|"height"/);
    expect(printed).toContain("diagram interactionOverview OrderFlow");
    expect(printed).toContain("initial --> ref Checkout");
    expect(printed).toContain("ref Checkout --> ref Fulfill");
    expect(printed).toContain("ref Fulfill --> final");

    const reparsed = parse("interactionOverview", printed);
    expect(reparsed.ok).toBe(true);
    if (!reparsed.ok) {
      throw new Error("expected reparsed print to succeed");
    }

    const reparsedModel = astToModel(reparsed.value.ast, initialModel);
    expect(structuralInteractionOverviewModel(reparsedModel)).toEqual(
      structuralInteractionOverviewModel(initialModel),
    );
  });
});
