import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { compileDiagram } from "./compile.js";
import { print } from "./print.js";
import { structuralActivityModel } from "./printActivity.js";

describe("activity compilation regressions", () => {
  it.each(["decision", "merge", "fork", "join"])("round-trips a connected default %s node created by the stencil", (keyword) => {
    const source = `diagram activity\n${keyword}\naction A\nA --> ${keyword}\n${keyword} --> final`;
    const first = compileDiagram("activity", source);
    expect(first.diagnostics).toEqual([]);
    expect(first.model?.relationships).toHaveLength(2);
    const next = compileDiagram("activity", print("activity", first.model!));
    expect(next.diagnostics).toEqual([]);
    expect(structuralActivityModel(next.model!)).toEqual(structuralActivityModel(first.model!));
  });
  it.each(["chatgpt", "gemini"])("compiles every flow in the supplied %s example and round-trips it", (provider) => {
    const source = readFileSync(new URL(`../../uml-dsl/src/fixtures/activity-hospital-${provider}.dsl`, import.meta.url), "utf8");
    const compiled = compileDiagram("activity", source);
    expect(compiled.diagnostics).toEqual([]);
    expect(compiled.model).toBeDefined();
    const model = compiled.model!;
    expect(model.relationships).toHaveLength(source.split("\n").filter((line) => line.includes("-->")).length);
    expect(model.elements.some((node) => node.elementType === "flowFinalNode")).toBe(true);
    const next = compileDiagram("activity", print("activity", model));
    expect(next.diagnostics).toEqual([]);
    const structure = (value: typeof model) => {
      const result = structuralActivityModel(value);
      result.elements.sort((a, b) => `${a.parentName}/${a.name}`.localeCompare(`${b.parentName}/${b.name}`));
      return result;
    };
    expect(structure(next.model!)).toEqual(structure(model));
    const reparsed = compileDiagram("activity", source, model);
    expect(reparsed.model?.elements.map((item) => item.id)).toEqual(model.elements.map((item) => item.id));
    expect(reparsed.model?.relationships.map((item) => item.id)).toEqual(model.relationships.map((item) => item.id));
  });

  it("reports unknown nodes at the exact reference instead of silently dropping a flow", () => {
    const source = "diagram activity\naction Login\nLogin --> Missing";
    const compiled = compileDiagram("activity", source);
    expect(compiled.diagnostics).toEqual([expect.objectContaining({
      ruleId: "dsl.unresolved-reference", message: "'Missing' is not declared",
      dslSpan: { start: source.indexOf("Missing"), end: source.length },
    })]);
  });

  it("preserves standalone default control nodes and their lane membership when printed", () => {
    const source = "diagram activity\npartition Patient { initial final flowFinal }";
    const first = compileDiagram("activity", source);
    const second = compileDiagram("activity", print("activity", first.model!));
    expect(second.diagnostics).toEqual([]);
    expect(structuralActivityModel(second.model!)).toEqual(structuralActivityModel(first.model!));
  });

  it("does not treat JavaScript prototype names as implicit nodes", () => {
    const compiled = compileDiagram("activity", "diagram activity\ninitial --> constructor");
    expect(compiled.diagnostics).toEqual([expect.objectContaining({ ruleId: "dsl.unresolved-reference" })]);
    expect(compiled.model?.elements.map((item) => item.elementType)).toEqual(["initialNode"]);
  });

  it("keeps same-named actions in separate lanes and diagnoses ambiguous flows", () => {
    const source = "diagram activity\npartition A { action Login }\npartition B { action Login }\ninitial --> Login";
    const first = compileDiagram("activity", source);
    expect(first.model?.elements.filter((item) => item.name === "Login")).toHaveLength(2);
    expect(first.diagnostics).toEqual([expect.objectContaining({ ruleId: "dsl.ambiguous-reference" })]);
    const second = compileDiagram("activity", source, first.model);
    expect(second.model?.elements.map((item) => item.id)).toEqual(first.model?.elements.map((item) => item.id));
  });

  it("diagnoses duplicate declarations in the same lane", () => {
    const compiled = compileDiagram("activity", "diagram activity\npartition Patient { action Login action Login }");
    expect(compiled.diagnostics.some((item) => item.ruleId === "dsl.duplicate-declaration")).toBe(true);
  });

  it("keeps repeated flows distinct and stable across reparses", () => {
    const source = "diagram activity\naction A\naction B\nA --> B : [same]\nA --> B : [same]";
    const first = compileDiagram("activity", source);
    const second = compileDiagram("activity", source, first.model);
    expect(new Set(first.model?.relationships.map((item) => item.id)).size).toBe(2);
    expect(second.model?.relationships.map((item) => item.id)).toEqual(first.model?.relationships.map((item) => item.id));
  });
});
