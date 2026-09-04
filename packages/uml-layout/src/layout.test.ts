import { describe, expect, it } from "vitest";
import { addElement, emptyModel } from "@graphiq/uml-model";
import { layoutDocument } from "./layoutDocument.js";
import { createClassFixtureModel, layoutClass, measureClassNode } from "./layoutClass.js";
import { emptyOverlay } from "./overlay.js";

describe("measureClassNode", () => {
  it("accounts for interface keyword and member rows", () => {
    const size = measureClassNode({
      id: "1",
      elementType: "interface",
      name: "Payable",
      attributes: [{ id: "a", visibility: "public", name: "amount", typeName: "Money" }],
      operations: [
        {
          id: "o",
          visibility: "public",
          name: "pay",
          parameters: [{ name: "amount", typeName: "Money" }],
          returnType: "Boolean",
        },
      ],
    });

    expect(size.width).toBe(180);
    expect(size.height).toBe(92);
  });
});

describe("layoutClass", () => {
  it("lays out three classes with generalization using finite coordinates", async () => {
    const model = createClassFixtureModel();
    const overlay = await layoutClass(model, emptyOverlay(), "full");

    for (const element of model.elements) {
      const node = overlay.nodes[element.id];
      expect(node).toBeDefined();
      expect(Number.isFinite(node?.x)).toBe(true);
      expect(Number.isFinite(node?.y)).toBe(true);
      expect(Number.isFinite(node?.width)).toBe(true);
      expect(Number.isFinite(node?.height)).toBe(true);
    }

    const base = overlay.nodes["class-base"];
    const middle = overlay.nodes["class-middle"];
    const leaf = overlay.nodes["class-leaf"];
    if (base === undefined || middle === undefined || leaf === undefined) {
      throw new Error("expected all fixture nodes to be positioned");
    }

    const ys = [base.y, middle.y, leaf.y];
    expect(Math.max(...ys)).toBeGreaterThan(Math.min(...ys));
  });

  it("preserves positioned nodes in incremental mode and lays out only new ids", async () => {
    const model = createClassFixtureModel();
    const firstPass = await layoutClass(model, emptyOverlay(), "full");
    const pinned = firstPass.nodes["class-base"];
    if (pinned === undefined) {
      throw new Error("expected base node");
    }

    const pinnedOverlay = {
      ...firstPass,
      nodes: {
        ...firstPass.nodes,
        "class-base": { ...pinned, x: 400, y: 120 },
      },
    };

    const withNewClass = addElement(model, {
      elementType: "class",
      name: "Added",
    });
    if (!withNewClass.ok) {
      throw new Error("expected addElement to succeed");
    }

    const updatedModel = withNewClass.value;
    const newClassId = updatedModel.elements.find((element) => element.name === "Added")?.id;
    if (newClassId === undefined) {
      throw new Error("expected new class id");
    }

    const incremental = await layoutClass(updatedModel, pinnedOverlay, "incremental");
    expect(incremental.nodes["class-base"]).toEqual(pinnedOverlay.nodes["class-base"]);

    const addedNode = incremental.nodes[newClassId];
    expect(addedNode).toBeDefined();
    expect(Number.isFinite(addedNode?.x)).toBe(true);
    expect(Number.isFinite(addedNode?.y)).toBe(true);
  });
});

describe("layoutDocument", () => {
  it("throws for non-class diagram kinds", async () => {
    const model = emptyModel("sequence");
    await expect(
      layoutDocument("sequence", model, emptyOverlay(), "first-open-empty-overlay"),
    ).rejects.toThrow("layout not implemented for sequence");

    await expect(
      layoutDocument("useCase", emptyModel("useCase"), emptyOverlay(), "topology-changed"),
    ).rejects.toThrow("layout not implemented for useCase");
  });
});
