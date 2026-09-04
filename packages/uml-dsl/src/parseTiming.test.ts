import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { KIND_MISMATCH_RULE_ID, PARSE_RULE_ID, parse } from "./index.js";

const fixtureDir = dirname(fileURLToPath(import.meta.url));
const lampFixture = readFileSync(
  join(fixtureDir, "fixtures/timing-lamp.dsl"),
  "utf8",
);

describe("parse timing diagram", () => {
  it("parses the section 5.13 fixture into lifelines and ordered states", () => {
    const result = parse("timing", lampFixture);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected parse to succeed");
    }

    const { ast } = result.value;
    expect(ast.kind).toBe("timing");
    if (ast.kind !== "timing") {
      throw new Error("expected timing ast");
    }

    expect(ast.name).toBe("Lamp");
    expect(ast.lifelines).toHaveLength(1);
    expect(ast.lifelines[0]).toMatchObject({
      name: "lamp",
      classifierName: "Lamp",
    });
    expect(ast.stateBlocks).toHaveLength(1);
    expect(ast.stateBlocks[0]?.lifelineName).toBe("lamp");
    expect(ast.stateBlocks[0]?.states.map((state) => state.name)).toEqual([
      "Off",
      "On",
      "Off",
    ]);
    expect(ast.stateBlocks[0]?.states.map((state) => state.at)).toEqual([0, 10, 40]);
  });

  it("parses duration and time constraints on states", () => {
    const result = parse(
      "timing",
      `diagram timing Constraints

lifeline lamp: Lamp

lamp {
  On @ 10 {10..40}
  Off @ 40 {40}
}
`,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected parse to succeed");
    }
    if (result.value.ast.kind !== "timing") {
      throw new Error("expected timing ast");
    }

    const states = result.value.ast.stateBlocks[0]?.states ?? [];
    expect(states[0]?.constraint).toMatchObject({
      constraintKind: "duration",
      min: 10,
      max: 40,
    });
    expect(states[1]?.constraint).toMatchObject({
      constraintKind: "time",
      time: 40,
    });
  });

  it("parses timing messages with @ time", () => {
    const result = parse(
      "timing",
      `diagram timing Msg

lifeline lamp: Lamp
lifeline sw: Switch

lamp {
  On @ 10
}

lamp -> sw @ 10 : tick()
`,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected parse to succeed");
    }
    if (result.value.ast.kind !== "timing") {
      throw new Error("expected timing ast");
    }

    expect(result.value.ast.messages).toHaveLength(1);
    expect(result.value.ast.messages[0]).toMatchObject({
      sourceName: "lamp",
      targetName: "sw",
      at: 10,
      messageSort: "synchCall",
      name: "tick()",
    });
  });

  it("recovers and keeps later valid states after a broken line", () => {
    const result = parse(
      "timing",
      `diagram timing Recovery

lifeline lamp: Lamp

lamp {
  Off @ 0
  Broken
  On @ 10
}
`,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected parse to succeed");
    }
    if (result.value.ast.kind !== "timing") {
      throw new Error("expected timing ast");
    }

    expect(result.value.diagnostics.some((diagnostic) => diagnostic.ruleId === PARSE_RULE_ID)).toBe(
      true,
    );
    expect(result.value.ast.stateBlocks[0]?.states.map((state) => state.at)).toEqual([0, 10]);
  });

  it("reports kind mismatch", () => {
    const result = parse("timing", "diagram class Wrong\n");
    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected failure");
    }
    expect(result.error.diagnostics[0]?.ruleId).toBe(KIND_MISMATCH_RULE_ID);
  });
});
