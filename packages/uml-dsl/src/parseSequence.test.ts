import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { KIND_MISMATCH_RULE_ID, PARSE_RULE_ID, parse } from "./index.js";

const fixtureDir = dirname(fileURLToPath(import.meta.url));
const checkoutFixture = readFileSync(
  join(fixtureDir, "fixtures/sequence-checkout.dsl"),
  "utf8",
);

describe("parse sequence diagram", () => {
  it("parses the section 5.11 fixture into lifelines and ordered messages", () => {
    const result = parse("sequence", checkoutFixture);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected parse to succeed");
    }

    const { ast } = result.value;
    expect(ast.kind).toBe("sequence");
    if (ast.kind !== "sequence") {
      throw new Error("expected sequence ast");
    }

    expect(ast.name).toBe("Checkout");
    expect(ast.lifelines).toHaveLength(3);
    expect(ast.lifelines.map((lifeline) => lifeline.name)).toEqual([
      "customer",
      "shop",
      "pay",
    ]);
    expect(ast.lifelines[0]?.classifierName).toBe("Actor");

    expect(ast.messages).toHaveLength(4);
    expect(ast.messages[0]).toMatchObject({
      sourceName: "customer",
      targetName: "shop",
      messageSort: "synchCall",
      name: "placeOrder()",
    });
    expect(ast.messages[1]?.messageSort).toBe("synchCall");
    expect(ast.messages[2]?.messageSort).toBe("reply");
    expect(ast.messages[3]?.messageSort).toBe("reply");
  });

  it("parses alt, opt, and loop combined fragments", () => {
    const result = parse(
      "sequence",
      `diagram sequence Fragments

lifeline a: A
lifeline b: B

alt {
  [ok]
  a -->> b : ok
  [else]
  a -->> b : fail
}

opt {
  a -> b : ping()
}

loop {
  a -> b : tick()
}
`,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected parse to succeed");
    }

    if (result.value.ast.kind !== "sequence") {
      throw new Error("expected sequence ast");
    }

    expect(result.value.ast.combinedFragments).toHaveLength(3);
    expect(result.value.ast.combinedFragments.map((fragment) => fragment.operator)).toEqual([
      "alt",
      "opt",
      "loop",
    ]);
    expect(result.value.ast.combinedFragments[0]?.operands).toHaveLength(2);
    expect(result.value.ast.combinedFragments[0]?.operands[0]?.guard).toBe("ok");
    expect(result.value.ast.combinedFragments[0]?.operands[1]?.guard).toBe("else");
  });

  it("recovers and still parses a following lifeline after a broken line", () => {
    const result = parse(
      "sequence",
      `diagram sequence Recovery

lifeline broken {
  name bad
}

lifeline good: Actor
`,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected partial parse");
    }

    expect(result.value.diagnostics.some((item) => item.ruleId === PARSE_RULE_ID)).toBe(
      true,
    );
    if (result.value.ast.kind !== "sequence") {
      throw new Error("expected sequence ast");
    }
    expect(result.value.ast.lifelines.some((lifeline) => lifeline.name === "good")).toBe(
      true,
    );
  });

  it("reports dsl.kind-mismatch when the header kind does not match", () => {
    const result = parse("sequence", "diagram class Order\n\nclass Order {}");

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
