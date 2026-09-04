import { describe, expect, it } from "vitest";
import { assertNever, DIAGRAM_KINDS, isDiagramKind } from "./index.js";
import type { DiagramKind } from "./index.js";

describe("DIAGRAM_KINDS", () => {
  it("contains exactly 14 unique diagram kinds", () => {
    expect(DIAGRAM_KINDS).toHaveLength(14);
    expect(new Set(DIAGRAM_KINDS).size).toBe(14);
  });

  it("every entry passes isDiagramKind", () => {
    for (const kind of DIAGRAM_KINDS) {
      expect(isDiagramKind(kind)).toBe(true);
    }
  });
});

describe("isDiagramKind", () => {
  it("rejects invalid strings", () => {
    expect(isDiagramKind("flowchart")).toBe(false);
    expect(isDiagramKind("abstractClass")).toBe(false);
    expect(isDiagramKind("Class")).toBe(false);
    expect(isDiagramKind("")).toBe(false);
  });
});

describe("exhaustive DiagramKind switch", () => {
  function labelForKind(kind: DiagramKind): string {
    switch (kind) {
      case "class":
        return "class";
      case "object":
        return "object";
      case "package":
        return "package";
      case "compositeStructure":
        return "compositeStructure";
      case "component":
        return "component";
      case "deployment":
        return "deployment";
      case "profile":
        return "profile";
      case "useCase":
        return "useCase";
      case "activity":
        return "activity";
      case "stateMachine":
        return "stateMachine";
      case "sequence":
        return "sequence";
      case "communication":
        return "communication";
      case "timing":
        return "timing";
      case "interactionOverview":
        return "interactionOverview";
      default:
        return assertNever(kind);
    }
  }

  it("labels every diagram kind", () => {
    for (const kind of DIAGRAM_KINDS) {
      expect(labelForKind(kind)).toBe(kind);
    }
  });
});
