import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { KIND_MISMATCH_RULE_ID, PARSE_RULE_ID, parse } from "./index.js";

const fixtureDir = dirname(fileURLToPath(import.meta.url));
const javaFixture = readFileSync(join(fixtureDir, "fixtures/profile-java.dsl"), "utf8");

describe("parse profile diagram", () => {
  it("parses the section 5.7 fixture into a stereotype with tagged values and an extension", () => {
    const result = parse("profile", javaFixture);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected parse to succeed");
    }

    const { ast } = result.value;
    expect(ast.kind).toBe("profile");
    if (ast.kind !== "profile") {
      throw new Error("expected profile ast");
    }

    expect(ast.name).toBe("JavaProfile");
    expect(ast.stereotypes).toEqual([
      expect.objectContaining({
        name: "Entity",
        attributes: [expect.objectContaining({ name: "table", typeName: "String" })],
      }),
    ]);
    expect(ast.relationships).toEqual([
      expect.objectContaining({
        relationshipKind: "extension",
        sourceName: "Entity",
        targetName: "Class",
      }),
    ]);
  });

  it("recovers and parses a second stereotype after a broken line", () => {
    const result = parse(
      "profile",
      `diagram profile Recovery

stereotype Good {
  table: String
}

stereotype @@@ broken

stereotype Recovered {
  schema: String
}
`,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected partial parse");
    }

    expect(result.value.diagnostics.some((item) => item.ruleId === PARSE_RULE_ID)).toBe(true);
    if (result.value.ast.kind !== "profile") {
      throw new Error("expected profile ast");
    }
    expect(result.value.ast.stereotypes.map((item) => item.name)).toContain("Good");
    expect(result.value.ast.stereotypes.map((item) => item.name)).toContain("Recovered");
  });

  it("reports dsl.kind-mismatch when the header kind does not match", () => {
    const result = parse("profile", "diagram class Order\n\nclass Order {}");

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
