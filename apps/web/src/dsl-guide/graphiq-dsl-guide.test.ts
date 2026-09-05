import { DIAGRAM_KINDS } from "@graphiq/uml-core";
import { describe, expect, it } from "vitest";
import { getDslGuideText } from "./downloadDslGuide.js";

describe("graphiq-dsl-guide.md", () => {
  it("includes every DIAGRAM_KINDS header and core usage guidance", () => {
    const guide = getDslGuideText();

    expect(guide).toContain("**not** Mermaid");
    expect(guide).toContain("**not** PlantUML");
    expect(guide).toContain("no coordinates");
    expect(guide).toContain("diagram <kind>");
    expect(guide).toContain("--|>");
    expect(guide).toContain("..|>");
    expect(guide).toContain("o--");
    expect(guide).toContain("*--");

    for (const kind of DIAGRAM_KINDS) {
      expect(guide).toContain(`diagram ${kind}`);
    }
  });
});
