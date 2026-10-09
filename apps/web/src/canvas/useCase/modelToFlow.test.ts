import { describe, expect, it } from "vitest";
import { emptyOverlay } from "@graphiq/uml-layout";
import type { UmlModel } from "@graphiq/uml-model";
import { useCaseModelToFlow } from "./modelToFlow.js";

describe("use case canvas flow", () => {
  it("draws a stereotyped dependency with its guillemet label", () => {
    const model: UmlModel = {
      id: "model",
      kind: "useCase",
      elements: [
        { id: "checkout", elementType: "useCase", name: "Checkout" },
        { id: "pay", elementType: "useCase", name: "Pay" },
      ],
      relationships: [
        {
          id: "trace",
          relationshipType: "dependency",
          sourceId: "checkout",
          targetId: "pay",
          name: "trace",
        },
      ],
    };

    const { edges } = useCaseModelToFlow(model, emptyOverlay(), []);
    expect(edges[0]?.data?.label).toBe("«trace»");
    expect(edges[0]?.data?.relationshipType).toBe("dependency");
  });
});
