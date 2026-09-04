import { createId } from "@graphiq/uml-core";
import { describe, expect, it } from "vitest";
import { addElement, emptyModel, type UmlModel } from "@graphiq/uml-model";
import { validate } from "../../validate.js";

describe("package diagram rules", () => {
  it("reports merge cycle for mutual package merge", () => {
    let model = emptyModel("package");
    const a = addElement(model, { elementType: "package", name: "a" });
    const b = addElement(a.ok ? a.value : model, { elementType: "package", name: "b" });
    if (!a.ok || !b.ok) {
      throw new Error("expected packages");
    }
    model = b.value;

    const aId = model.elements.find((element) => element.name === "a")?.id;
    const bId = model.elements.find((element) => element.name === "b")?.id;
    if (aId === undefined || bId === undefined) {
      throw new Error("expected ids");
    }

    const modelWithCycle: UmlModel = {
      ...model,
      relationships: [
        {
          id: createId(),
          relationshipType: "packageMerge",
          sourceId: aId,
          targetId: bId,
        },
        {
          id: createId(),
          relationshipType: "packageMerge",
          sourceId: bId,
          targetId: aId,
        },
      ],
    };

    const diagnostics = validate("package", modelWithCycle);
    expect(diagnostics.some((diagnostic) => diagnostic.ruleId === "pkg.no-cycle-merge")).toBe(
      true,
    );
  });
});
