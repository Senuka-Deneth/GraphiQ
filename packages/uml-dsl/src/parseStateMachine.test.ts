import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { KIND_MISMATCH_RULE_ID, PARSE_RULE_ID, parse } from "./index.js";

const fixtureDir = dirname(fileURLToPath(import.meta.url));
const orderLifecycleFixture = readFileSync(
  join(fixtureDir, "fixtures/state-machine-order-lifecycle.dsl"),
  "utf8",
);

describe("parse state machine diagram", () => {
  it("parses the section 5.10 fixture into implicit states and labeled transitions", () => {
    const result = parse("stateMachine", orderLifecycleFixture);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected parse to succeed");
    }

    const { ast } = result.value;
    expect(ast.kind).toBe("stateMachine");
    if (ast.kind !== "stateMachine") {
      throw new Error("expected stateMachine ast");
    }

    expect(ast.name).toBe("OrderLifecycle");
    expect(ast.transitions).toEqual([
      expect.objectContaining({
        sourceName: "[*]",
        targetName: "Draft",
        sourceIsStar: true,
        targetIsStar: false,
      }),
      expect.objectContaining({
        sourceName: "Draft",
        targetName: "Paid",
        trigger: "pay",
        guard: "amount > 0",
        effect: "emitReceipt",
      }),
      expect.objectContaining({
        sourceName: "Paid",
        targetName: "[*]",
        targetIsStar: true,
      }),
    ]);
  });

  it("parses composite state bodies with entry, do, exit, and nested transitions", () => {
    const result = parse(
      "stateMachine",
      `diagram stateMachine Composite

state Checkout {
  entry / start
  do / wait
  exit / stop
  [*] --> Nested
  Nested --> [*]
}
`,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected parse to succeed");
    }
    if (result.value.ast.kind !== "stateMachine") {
      throw new Error("expected stateMachine ast");
    }

    const state = result.value.ast.items.find(
      (item) => item.itemKind === "state" && item.state.name === "Checkout",
    );
    expect(state?.itemKind).toBe("state");
    if (state?.itemKind !== "state") {
      throw new Error("expected state item");
    }
    expect(state.state.entry).toBe("start");
    expect(state.state.do).toBe("wait");
    expect(state.state.exit).toBe("stop");
    expect(state.state.items.filter((item) => item.itemKind === "transition")).toHaveLength(2);
  });

  it("parses explicit regions and pseudostate keywords", () => {
    const result = parse(
      "stateMachine",
      `diagram stateMachine Orthogonal

state Orthogonal {
  region first { [*] --> A }
  region second { [*] --> B }
}

choice C
junction J
fork F
join G
history H
deepHistory DH
terminate T
`,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected parse to succeed");
    }
    if (result.value.ast.kind !== "stateMachine") {
      throw new Error("expected stateMachine ast");
    }

    const orthogonal = result.value.ast.items.find(
      (item) => item.itemKind === "state" && item.state.name === "Orthogonal",
    );
    expect(orthogonal?.itemKind).toBe("state");
    if (orthogonal?.itemKind !== "state") {
      throw new Error("expected orthogonal state");
    }
    expect(orthogonal.state.items.filter((item) => item.itemKind === "region")).toHaveLength(2);

    const pseudostates = result.value.ast.items.filter((item) => item.itemKind === "pseudostate");
    expect(pseudostates.map((item) => item.pseudostate.name)).toEqual([
      "C",
      "J",
      "F",
      "G",
      "H",
      "DH",
      "T",
    ]);
  });

  it("recovers and parses a second state after a broken line", () => {
    const result = parse(
      "stateMachine",
      `diagram stateMachine Recovery

[*] --> Good

state @@@ broken

[*] --> Recovered
`,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected partial parse");
    }

    expect(result.value.diagnostics.some((item) => item.ruleId === PARSE_RULE_ID)).toBe(true);
    if (result.value.ast.kind !== "stateMachine") {
      throw new Error("expected stateMachine ast");
    }
    expect(
      result.value.ast.transitions.some(
        (transition) => transition.targetName === "Good" || transition.targetName === "Recovered",
      ),
    ).toBe(true);
  });

  it("reports a kind mismatch for diagram class on a stateMachine document", () => {
    const result = parse("stateMachine", "diagram class Wrong\n\nclass A {}");
    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected kind mismatch");
    }
    expect(result.error.diagnostics[0]?.ruleId).toBe(KIND_MISMATCH_RULE_ID);
  });
});
