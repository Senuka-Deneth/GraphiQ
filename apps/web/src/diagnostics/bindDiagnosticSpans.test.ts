import { describe, expect, it } from "vitest";
import type { Diagnostic } from "@graphiq/uml-core";
import type { ClassDiagramAst } from "@graphiq/uml-dsl";
import { bindClassDiagnosticSpans, buildDiagnosticSeverityMap } from "./bindDiagnosticSpans.js";

const sampleAst: ClassDiagramAst = {
  kind: "class",
  classifiers: [
    {
      classifierKind: "class",
      name: "A",
      isAbstract: false,
      attributes: [],
      operations: [],
      span: { start: 20, end: 40 },
    },
    {
      classifierKind: "interface",
      name: "B",
      attributes: [],
      operations: [],
      span: { start: 42, end: 62 },
    },
  ],
  relationships: [
    {
      sourceName: "A",
      targetName: "B",
      relationshipType: "generalization",
      span: { start: 64, end: 74 },
    },
  ],
  span: { start: 0, end: 74 },
};

describe("bindClassDiagnosticSpans", () => {
  it("copies relationship span onto model diagnostics", () => {
    const model = {
      id: "m1",
      kind: "class" as const,
      elements: [
        {
          id: "el-a",
          elementType: "class" as const,
          name: "A",
          isAbstract: false,
          attributes: [],
          operations: [],
        },
        {
          id: "el-b",
          elementType: "interface" as const,
          name: "B",
          attributes: [],
          operations: [],
        },
      ],
      relationships: [
        {
          id: "rel-1",
          relationshipType: "generalization" as const,
          sourceId: "el-a",
          targetId: "el-b",
        },
      ],
    };

    const diagnostics: Diagnostic[] = [
      {
        id: "d1",
        ruleId: "class.gen.same-metaclass",
        severity: "error",
        message: "bad generalization",
        elementIds: ["rel-1", "el-a", "el-b"],
      },
    ];

    const bound = bindClassDiagnosticSpans(sampleAst, model, diagnostics);
    expect(bound[0]?.dslSpan).toEqual({ start: 64, end: 74 });
  });
});

describe("buildDiagnosticSeverityMap", () => {
  it("prefers error over warning for the same id", () => {
    const map = buildDiagnosticSeverityMap([
      {
        id: "d1",
        ruleId: "warn",
        severity: "warning",
        message: "warn",
        elementIds: ["node-1"],
      },
      {
        id: "d2",
        ruleId: "err",
        severity: "error",
        message: "err",
        elementIds: ["node-1"],
      },
    ]);

    expect(map.get("node-1")).toBe("error");
  });
});
