import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ReactFlowProvider } from "@xyflow/react";
import { ClassCanvas } from "./ClassCanvas.js";
import { classCanvasFixture } from "./fixtureModel.js";
import { modelToFlow } from "./modelToFlow.js";
import { getRelationshipNotation } from "@graphiq/uml-notation";

describe("ClassCanvas", () => {
  it("renders UML marker defs including generalization and composition markers", () => {
    render(<ClassCanvas />);
    const generalization = document.getElementById("gen-hollow-triangle");
    const composition = document.getElementById("comp-filled-diamond");
    expect(generalization).not.toBeNull();
    expect(composition).not.toBeNull();
    expect(generalization?.querySelector("path")?.getAttribute("stroke")).toBe("#0f172a");
    expect(generalization?.querySelector("path")?.getAttribute("fill")).toBe("#ffffff");
    expect(composition?.querySelector("path")?.getAttribute("fill")).toBe("#0f172a");
    expect(composition?.querySelector("path")?.getAttribute("stroke")).not.toBe("currentColor");
  });

  it("maps generalization to gen-hollow-triangle and composition to comp-filled-diamond", () => {
    const { edges } = modelToFlow(classCanvasFixture.model, classCanvasFixture.overlay);
    const generalization = edges.find((edge) => edge.id === "rel-gen");
    const composition = edges.find((edge) => edge.id === "rel-comp");

    expect(generalization?.data?.relationshipType).toBe("generalization");
    expect(composition?.data?.relationshipType).toBe("composition");
    expect(getRelationshipNotation("generalization").targetMarkerId).toBe("gen-hollow-triangle");
    expect(getRelationshipNotation("composition").sourceMarkerId).toBe("comp-filled-diamond");
  });
});

describe("ClassCanvas provider", () => {
  it("mounts within ReactFlowProvider", () => {
    render(
      <ReactFlowProvider>
        <ClassCanvas />
      </ReactFlowProvider>,
    );
    expect(document.getElementById("gen-hollow-triangle")).not.toBeNull();
  });
});
