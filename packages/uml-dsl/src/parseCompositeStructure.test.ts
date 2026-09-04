import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { KIND_MISMATCH_RULE_ID, PARSE_RULE_ID, parse } from "./index.js";

const fixtureDir = dirname(fileURLToPath(import.meta.url));
const carFixture = readFileSync(
  join(fixtureDir, "fixtures/compositeStructure-car.dsl"),
  "utf8",
);

describe("parse composite structure diagram", () => {
  it("parses the section 5.4 fixture into a frame, parts, ports, and a connector", () => {
    const result = parse("compositeStructure", carFixture);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected parse to succeed");
    }

    const { ast } = result.value;
    expect(ast.kind).toBe("compositeStructure");
    if (ast.kind !== "compositeStructure") {
      throw new Error("expected composite structure ast");
    }

    expect(ast.name).toBe("CarInternals");
    expect(ast.frames).toEqual([
      expect.objectContaining({
        frameKind: "class",
        name: "Car",
        items: [
          expect.objectContaining({
            itemKind: "part",
            name: "engine",
            typeName: "Engine",
          }),
          expect.objectContaining({
            itemKind: "part",
            name: "wheels",
            typeName: "Wheel",
            multiplicity: "4",
          }),
          expect.objectContaining({
            itemKind: "port",
            name: "power",
            typeName: "PowerPort",
          }),
        ],
      }),
    ]);
    expect(ast.connectors).toEqual([
      expect.objectContaining({
        name: "c1",
        sourceEnd: { rootName: "engine", portName: "power" },
        targetEnd: { rootName: "power" },
      }),
    ]);
  });

  it("recovers and parses a second part after a broken line", () => {
    const result = parse(
      "compositeStructure",
      `diagram compositeStructure Recovery

class Car {
  part good: Good

  part @@@ broken

  part recovered: Recovered
}
`,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected partial parse");
    }

    expect(result.value.diagnostics.some((item) => item.ruleId === PARSE_RULE_ID)).toBe(true);
    if (result.value.ast.kind !== "compositeStructure") {
      throw new Error("expected composite structure ast");
    }

    const frame = result.value.ast.frames[0];
    expect(frame?.items.some((item) => item.itemKind === "part" && item.name === "good")).toBe(
      true,
    );
    expect(
      frame?.items.some((item) => item.itemKind === "part" && item.name === "recovered"),
    ).toBe(true);
  });

  it("reports dsl.kind-mismatch when the header kind does not match", () => {
    const result = parse("compositeStructure", "diagram class Car\n\nclass Car {}");

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected kind mismatch failure");
    }

    expect(result.error.diagnostics).toEqual([
      expect.objectContaining({
        ruleId: KIND_MISMATCH_RULE_ID,
      }),
    ]);
  });
});
