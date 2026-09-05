import { createId } from "@graphiq/uml-core";
import type { Diagnostic } from "@graphiq/uml-core";
import type { UmlModel } from "@graphiq/uml-model";
import type { UmlRule } from "../../types.js";

const RULE_ID = "sm.composite-has-region";

const NESTED_VERTEX_TYPES = new Set(["state", "pseudostate", "finalState"] as const);

export const stateMachineCompositeHasRegionRule: UmlRule = {
  id: RULE_ID,
  diagramKinds: ["stateMachine"],
  severity: "error",
  check(model: UmlModel): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    for (const element of model.elements) {
      if (element.elementType !== "state") {
        continue;
      }

      const directChildren = model.elements.filter(
        (child) => child.parentId === element.id,
      );
      const nestedVertices = directChildren.filter((child) =>
        NESTED_VERTEX_TYPES.has(child.elementType as "state" | "pseudostate" | "finalState"),
      );
      const regions = directChildren.filter((child) => child.elementType === "region");

      if (nestedVertices.length > 0 && regions.length === 0) {
        diagnostics.push({
          id: createId(),
          ruleId: RULE_ID,
          severity: "error",
          message: "A composite state with nested vertices must contain at least one region",
          elementIds: [element.id, ...nestedVertices.map((child) => child.id)],
        });
      }
    }

    return diagnostics;
  },
};
