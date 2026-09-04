import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parse } from "@graphiq/uml-dsl";
import { astToModel, print, structuralObjectModel } from "./index.js";

const fixtureDir = dirname(fileURLToPath(import.meta.url));
const checkoutFixture = readFileSync(
  join(fixtureDir, "../../uml-dsl/src/fixtures/object-checkout.dsl"),
  "utf8",
);

describe("print object diagram", () => {
  it("round-trips the section 5.2 fixture", () => {
    const firstParse = parse("object", checkoutFixture);
    expect(firstParse.ok).toBe(true);
    if (!firstParse.ok) {
      throw new Error("expected parse to succeed");
    }

    const model = astToModel(firstParse.value.ast);
    const printed = print("object", model, { name: firstParse.value.ast.name });
    const secondParse = parse("object", printed);
    expect(secondParse.ok).toBe(true);
    if (!secondParse.ok) {
      throw new Error("expected second parse to succeed");
    }

    const reparsedModel = astToModel(secondParse.value.ast, model);
    expect(structuralObjectModel(reparsedModel)).toEqual(structuralObjectModel(model));
  });
});
