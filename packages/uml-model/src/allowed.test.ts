import { DIAGRAM_KINDS } from "@graphiq/uml-core";
import { describe, expect, it } from "vitest";
import {
  allowedElements,
  allowedRelationships,
  isElementAllowedOn,
  isRelationshipAllowedOn,
} from "./allowed.js";

describe("allowed sets", () => {
  it("covers every diagram kind", () => {
    for (const kind of DIAGRAM_KINDS) {
      expect(allowedElements(kind).size).toBeGreaterThan(0);
      expect(allowedRelationships(kind).size).toBeGreaterThan(0);
    }
  });

  it("allows generalization on class diagrams", () => {
    expect(isRelationshipAllowedOn("class", "generalization")).toBe(true);
  });

  it("allows message on sequence diagrams", () => {
    expect(isRelationshipAllowedOn("sequence", "message")).toBe(true);
  });

  it("rejects message on class diagrams", () => {
    expect(isRelationshipAllowedOn("class", "message")).toBe(false);
  });

  it("allows class on class diagrams but not on sequence diagrams", () => {
    expect(isElementAllowedOn("class", "class")).toBe(true);
    expect(isElementAllowedOn("sequence", "class")).toBe(false);
  });
});
