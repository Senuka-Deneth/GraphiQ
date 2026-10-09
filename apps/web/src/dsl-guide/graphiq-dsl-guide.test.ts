import { DIAGRAM_KINDS, isDiagramKind } from "@graphiq/uml-core";
import { compileDiagram } from "@graphiq/uml-print";
import { validate } from "@graphiq/uml-rules";
import { describe, expect, it } from "vitest";
import { getDslGuideText } from "./downloadDslGuide.js";

describe("graphiq-dsl-guide.md", () => {
  const examples = [...getDslGuideText().matchAll(/```text\n(diagram (\w+)[\s\S]*?)```/g)]
    .filter((match) => match[2] !== undefined && isDiagramKind(match[2]))
    .map((match) => ({ kind: match[2]!, source: match[1]! }));

  it.each(examples)("compiles and validates the $kind guide example", (example) => {
    const kind = example.kind;
    if (!isDiagramKind(kind)) throw new Error("invalid example kind");
    const compiled = compileDiagram(kind, example.source);
    expect(compiled.model).toBeDefined();
    const diagnostics = [
      ...compiled.diagnostics,
      ...(compiled.model ? validate(kind, compiled.model) : []),
    ];
    expect(diagnostics.filter((item) => item.severity === "error")).toEqual([]);
  });
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
