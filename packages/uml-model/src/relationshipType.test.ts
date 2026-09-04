import { describe, expect, it } from "vitest";
import { RELATIONSHIP_TYPES } from "./relationshipType.js";

describe("RELATIONSHIP_TYPES", () => {
  it("contains exactly 28 unique relationship types", () => {
    expect(RELATIONSHIP_TYPES).toHaveLength(28);
    expect(new Set(RELATIONSHIP_TYPES).size).toBe(28);
  });
});
