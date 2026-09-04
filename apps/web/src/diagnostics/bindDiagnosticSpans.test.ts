import { describe, expect, it } from "vitest";
import type { Diagnostic } from "@graphiq/uml-core";
import type { ObjectDiagramAst } from "@graphiq/uml-dsl";
import { bindDiagnosticSpans, buildDiagnosticSeverityMap } from "./bindDiagnosticSpans.js";

const sampleObjectAst: ObjectDiagramAst = {
  kind: "object",
  instances: [
    {
      name: "a",
      classifierName: "Order",
      slots: [],
      span: { start: 20, end: 40 },
    },
  ],
  relationships: [
    {
      sourceName: "a",
      targetName: "b",
      relationshipType: "link",
      span: { start: 42, end: 52 },
    },
  ],
  span: { start: 0, end: 52 },
};

describe("bindDiagnosticSpans", () => {
  it("copies object relationship span onto model diagnostics", () => {
    const model = {
      id: "m1",
      kind: "object" as const,
      elements: [
        {
          id: "el-a",
          elementType: "instanceSpecification" as const,
          name: "a",
          classifierName: "Order",
          slots: [],
        },
        {
          id: "el-b",
          elementType: "instanceSpecification" as const,
          name: "b",
          classifierName: "LineItem",
          slots: [],
        },
      ],
      relationships: [
        {
          id: "rel-1",
          relationshipType: "link" as const,
          sourceId: "el-a",
          targetId: "el-b",
        },
      ],
    };

    const diagnostics: Diagnostic[] = [
      {
        id: "d1",
        ruleId: "object.link-two-instances",
        severity: "error",
        message: "bad link",
        elementIds: ["rel-1"],
      },
    ];

    const bound = bindDiagnosticSpans(sampleObjectAst, model, diagnostics);
    expect(bound[0]?.dslSpan).toEqual({ start: 42, end: 52 });
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
