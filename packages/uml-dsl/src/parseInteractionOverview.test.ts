import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { KIND_MISMATCH_RULE_ID, PARSE_RULE_ID, parse } from "./index.js";

const fixtureDir = dirname(fileURLToPath(import.meta.url));
const orderFlowFixture = readFileSync(
  join(fixtureDir, "fixtures/interaction-overview-order-flow.dsl"),
  "utf8",
);

describe("parse interaction overview diagram", () => {
  it("parses the section 5.14 fixture into ref flows", () => {
    const result = parse("interactionOverview", orderFlowFixture);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected parse to succeed");
    }

    const { ast } = result.value;
    expect(ast.kind).toBe("interactionOverview");
    if (ast.kind !== "interactionOverview") {
      throw new Error("expected interaction overview ast");
    }

    expect(ast.name).toBe("OrderFlow");
    expect(ast.flows).toEqual([
      expect.objectContaining({
        sourceName: "initial",
        targetName: "Checkout",
        sourceIsRef: false,
        targetIsRef: true,
      }),
      expect.objectContaining({
        sourceName: "Checkout",
        targetName: "Fulfill",
        sourceIsRef: true,
        targetIsRef: true,
      }),
      expect.objectContaining({
        sourceName: "Fulfill",
        targetName: "final",
        sourceIsRef: true,
        targetIsRef: false,
      }),
    ]);
  });

  it("parses declared control nodes and a guarded decision flow", () => {
    const result = parse(
      "interactionOverview",
      `diagram interactionOverview Guarded

decision CheckStock
ref Pack

CheckStock --> ref Pack : [inStock]
`,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected guarded parse");
    }
    if (result.value.ast.kind !== "interactionOverview") {
      throw new Error("expected interaction overview ast");
    }

    expect(result.value.ast.nodes.map((item) => item.name)).toEqual(
      expect.arrayContaining(["CheckStock", "Pack"]),
    );
    expect(result.value.ast.nodes).toHaveLength(2);
    expect(result.value.ast.flows[0]).toEqual(
      expect.objectContaining({
        sourceName: "CheckStock",
        targetName: "Pack",
        sourceIsRef: false,
        targetIsRef: true,
        guard: "inStock",
      }),
    );
  });

  it("recovers and parses a second ref after a broken line", () => {
    const result = parse(
      "interactionOverview",
      `diagram interactionOverview Recovery

ref good

ref @@@ broken

ref recovered
`,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected partial parse");
    }

    expect(result.value.diagnostics.some((item) => item.ruleId === PARSE_RULE_ID)).toBe(true);
    if (result.value.ast.kind !== "interactionOverview") {
      throw new Error("expected interaction overview ast");
    }
    expect(result.value.ast.nodes.map((item) => item.name)).toContain("good");
    expect(result.value.ast.nodes.map((item) => item.name)).toContain("recovered");
  });

  it("does not accept sequence-style messages at the overview top level", () => {
    const result = parse(
      "interactionOverview",
      `diagram interactionOverview Bad

initial --> ref Checkout
A -> B : hello
`,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected parse with diagnostics");
    }
    expect(result.value.diagnostics.some((item) => item.ruleId === PARSE_RULE_ID)).toBe(true);
    if (result.value.ast.kind !== "interactionOverview") {
      throw new Error("expected interaction overview ast");
    }
    expect(result.value.ast.flows).toEqual([
      expect.objectContaining({
        sourceName: "initial",
        targetName: "Checkout",
        targetIsRef: true,
      }),
    ]);
  });

  it("reports dsl.kind-mismatch when the header kind does not match", () => {
    const result = parse("interactionOverview", "diagram class Order\n\nclass A {}");

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
