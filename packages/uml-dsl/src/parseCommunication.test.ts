import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { KIND_MISMATCH_RULE_ID, PARSE_RULE_ID, parse } from "./index.js";

const fixtureDir = dirname(fileURLToPath(import.meta.url));
const checkoutFixture = readFileSync(
  join(fixtureDir, "fixtures/communication-checkout.dsl"),
  "utf8",
);

describe("parse communication diagram", () => {
  it("parses the section 5.12 fixture into instances and numbered messages", () => {
    const result = parse("communication", checkoutFixture);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected parse to succeed");
    }

    const { ast } = result.value;
    expect(ast.kind).toBe("communication");
    if (ast.kind !== "communication") {
      throw new Error("expected communication ast");
    }

    expect(ast.name).toBe("CheckoutComm");
    expect(ast.instances.map((item) => item.name)).toEqual(["customer", "shop"]);
    expect(ast.messages).toEqual([
      expect.objectContaining({
        sourceName: "customer",
        targetName: "shop",
        sequenceNumber: "1",
        messageName: "placeOrder()",
      }),
      expect.objectContaining({
        sourceName: "shop",
        targetName: "customer",
        sequenceNumber: "2",
        messageName: "confirm()",
      }),
    ]);
  });

  it("recovers and parses a second instance after a broken line", () => {
    const result = parse(
      "communication",
      `diagram communication Recovery

instance good: Good

instance @@@ broken

instance recovered: Recovered
`,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected partial parse");
    }

    expect(result.value.diagnostics.some((item) => item.ruleId === PARSE_RULE_ID)).toBe(true);
    if (result.value.ast.kind !== "communication") {
      throw new Error("expected communication ast");
    }
    expect(result.value.ast.instances.map((item) => item.name)).toContain("good");
    expect(result.value.ast.instances.map((item) => item.name)).toContain("recovered");
  });

  it("reports dsl.kind-mismatch when the header kind does not match", () => {
    const result = parse("communication", "diagram object Order\n\ninstance a: A");

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
