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
    expect(document.getElementById("gen-hollow-triangle")).not.toBeNull();
    expect(document.getElementById("comp-filled-diamond")).not.toBeNull();
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
