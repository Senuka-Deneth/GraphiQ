import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { KIND_MISMATCH_RULE_ID, PARSE_RULE_ID, parse } from "./index.js";

const fixtureDir = dirname(fileURLToPath(import.meta.url));
const fulfillOrderFixture = readFileSync(
  join(fixtureDir, "fixtures/activity-fulfill-order.dsl"),
  "utf8",
);

describe("parse activity diagram", () => {
  it("keeps unnamed control declarations from consuming the following line", () => {
    const result = parse("activity", "diagram activity\naction A\ninitial\nA --> final");
    expect(result.ok).toBe(true);
    if (!result.ok || result.value.ast.kind !== "activity") throw new Error("expected activity");
    expect(result.value.diagnostics).toEqual([]);
    expect(result.value.ast.nodes.some((node) => node.nodeKind === "initialNode" && node.name === "initial")).toBe(true);
    expect(result.value.ast.flows).toHaveLength(1);
  });

  it("preserves guard expressions and keyword-prefixed identifiers", () => {
    const result = parse("activity", "diagram activity\naction flowFinalization\naction decisionResult\nflowFinalization --> decisionResult : [amount > 0 && status == paid]");
    expect(result.ok).toBe(true);
    if (!result.ok || result.value.ast.kind !== "activity") throw new Error("expected activity");
    expect(result.value.diagnostics).toEqual([]);
    expect(result.value.ast.flows[0]?.guard).toBe("amount > 0 && status == paid");
  });

  it.each(["A --> merge Merge", "merge Merge --> A", "A --> join Join"])("supports inline control endpoints: %s", (flow) => {
    const result = parse("activity", `diagram activity\naction A\n${flow}`);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected parse");
    expect(result.value.diagnostics).toEqual([]);
  });

  it("reports a concise missing-name error at the end of the source", () => {
    const source = "diagram activity\naction";
    const result = parse("activity", source);
    const diagnostics = result.ok ? result.value.diagnostics : result.error.diagnostics;
    expect(diagnostics[0]).toMatchObject({ dslSpan: { start: source.length, end: source.length } });
    expect(diagnostics[0]?.message).toContain("Expected a name");
    expect(diagnostics[0]?.message.length).toBeLessThan(150);
  });
  it("parses the section 5.9 fixture into partitions, actions, and flows", () => {
    const result = parse("activity", fulfillOrderFixture);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected parse to succeed");
    }

    const { ast } = result.value;
    expect(ast.kind).toBe("activity");
    if (ast.kind !== "activity") {
      throw new Error("expected activity ast");
    }

    expect(ast.name).toBe("FulfillOrder");
    expect(ast.partitions.map((item) => item.name)).toEqual(["Sales", "Warehouse"]);
    expect(
      ast.partitions.flatMap((partition) =>
        partition.items.flatMap((item) => (item.itemKind === "node" ? [item.node.name] : [])),
      ),
    ).toEqual(["ReceiveOrder", "Pack", "Ship"]);
    expect(ast.flows).toEqual([
      expect.objectContaining({ sourceName: "initial", targetName: "ReceiveOrder" }),
      expect.objectContaining({ sourceName: "ReceiveOrder", targetName: "Pack" }),
      expect.objectContaining({ sourceName: "Pack", targetName: "Ship" }),
      expect.objectContaining({ sourceName: "Ship", targetName: "final" }),
    ]);
  });

  it("recovers and parses a second action after a broken line", () => {
    const result = parse(
      "activity",
      `diagram activity Recovery

action good

action @@@ broken

action recovered
`,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected partial parse");
    }

    expect(result.value.diagnostics.some((item) => item.ruleId === PARSE_RULE_ID)).toBe(true);
    if (result.value.ast.kind !== "activity") {
      throw new Error("expected activity ast");
    }
    expect(result.value.ast.nodes.map((item) => item.name)).toContain("good");
    expect(result.value.ast.nodes.map((item) => item.name)).toContain("recovered");
  });

  it("parses a guarded decision flow", () => {
    const result = parse(
      "activity",
      `diagram activity Guarded

decision CheckStock
action Pack

CheckStock --> Pack : [inStock]
`,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected guarded parse");
    }
    if (result.value.ast.kind !== "activity") {
      throw new Error("expected activity ast");
    }
    expect(result.value.ast.flows[0]).toEqual(
      expect.objectContaining({
        sourceName: "CheckStock",
        targetName: "Pack",
        guard: "inStock",
      }),
    );
  });

  it("reports dsl.kind-mismatch when the header kind does not match", () => {
    const result = parse("activity", "diagram class Order\n\nclass A {}");

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
