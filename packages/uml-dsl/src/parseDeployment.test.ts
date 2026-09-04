import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { KIND_MISMATCH_RULE_ID, PARSE_RULE_ID, parse } from "./index.js";

const fixtureDir = dirname(fileURLToPath(import.meta.url));
const prodFixture = readFileSync(join(fixtureDir, "fixtures/deployment-prod.dsl"), "utf8");

describe("parse deployment diagram", () => {
  it("parses the section 5.6 fixture into devices, nested artifacts, and a communication path", () => {
    const result = parse("deployment", prodFixture);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected parse to succeed");
    }

    const { ast } = result.value;
    expect(ast.kind).toBe("deployment");
    if (ast.kind !== "deployment") {
      throw new Error("expected deployment ast");
    }

    expect(ast.name).toBe("Prod");
    expect(ast.nodes).toEqual([
      expect.objectContaining({
        name: "AppCluster",
        nodeKind: "device",
        items: [expect.objectContaining({ itemKind: "artifact", name: "shop.war" })],
      }),
      expect.objectContaining({
        name: "DB",
        nodeKind: "device",
        items: [expect.objectContaining({ itemKind: "artifact", name: "shop.db" })],
      }),
    ]);
    expect(ast.relationships).toEqual([
      expect.objectContaining({
        relationshipKind: "communicationPath",
        sourceName: "AppCluster",
        targetName: "DB",
        name: "SQL",
      }),
    ]);
  });

  it("parses execution environments, deploy arrows, and generalizations", () => {
    const result = parse(
      "deployment",
      `diagram deployment Mixed

node JVM <<executionEnvironment>> {
  artifact app.jar
}

node Host
app.jar ..> Host
JVM --|> Host
`,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected parse to succeed");
    }
    if (result.value.ast.kind !== "deployment") {
      throw new Error("expected deployment ast");
    }

    expect(result.value.ast.nodes).toEqual([
      expect.objectContaining({
        name: "JVM",
        nodeKind: "executionEnvironment",
      }),
      expect.objectContaining({
        name: "Host",
        nodeKind: "node",
      }),
    ]);
    expect(result.value.ast.relationships).toEqual([
      expect.objectContaining({
        relationshipKind: "deployment",
        sourceName: "app.jar",
        targetName: "Host",
      }),
      expect.objectContaining({
        relationshipKind: "generalization",
        sourceName: "JVM",
        targetName: "Host",
      }),
    ]);
  });

  it("recovers and parses a second node after a broken line", () => {
    const result = parse(
      "deployment",
      `diagram deployment Recovery

node Good {
  artifact ok.jar
}

node @@@ broken

node Recovered {
  artifact later.jar
}
`,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected partial parse");
    }

    expect(result.value.diagnostics.some((item) => item.ruleId === PARSE_RULE_ID)).toBe(true);
    if (result.value.ast.kind !== "deployment") {
      throw new Error("expected deployment ast");
    }
    expect(result.value.ast.nodes.map((node) => node.name)).toContain("Good");
    expect(result.value.ast.nodes.map((node) => node.name)).toContain("Recovered");
  });

  it("reports dsl.kind-mismatch when the header kind does not match", () => {
    const result = parse("deployment", "diagram class Order\n\nclass Order {}");

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
