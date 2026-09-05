import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { buildClassSourceMap, parse } from "./index.js";

const fixtureDir = dirname(fileURLToPath(import.meta.url));
const formatPreservingFixture = readFileSync(
  join(fixtureDir, "fixtures/class-format-preserving.dsl"),
  "utf8",
);

describe("parse class comments", () => {
  it("returns comment tokens from parse", () => {
    const result = parse("class", formatPreservingFixture);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected parse to succeed");
    }
    expect(result.value.comments.length).toBeGreaterThan(0);
    expect(result.value.comments[0]?.image).toContain("attached to Order");
  });

  it("attaches leading comments to the next classifier in the source map", () => {
    const result = parse("class", formatPreservingFixture);
    expect(result.ok).toBe(true);
    if (!result.ok || result.value.ast.kind !== "class") {
      throw new Error("expected class parse");
    }

    const sourceMap = buildClassSourceMap(
      formatPreservingFixture,
      result.value.ast,
      result.value.comments,
    );
    const orderChunk = sourceMap.classifiers.find(
      (chunk) => chunk.classifier.name === "Order",
    );
    expect(orderChunk?.leadingComments[0]?.image).toContain("attached to Order");
  });
});
