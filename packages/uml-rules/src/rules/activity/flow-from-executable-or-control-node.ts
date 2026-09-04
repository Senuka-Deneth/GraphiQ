import { createId } from "@graphiq/uml-core";
import type { Diagnostic } from "@graphiq/uml-core";
import type { ElementType, UmlModel } from "@graphiq/uml-model";
import type { UmlRule } from "../../types.js";

const RULE_ID = "act.flow-from-executable-or-control-node";

const CONTROL_OR_EXECUTABLE: ReadonlySet<ElementType> = new Set([
  "action",
  "initialNode",
  "activityFinalNode",
  "flowFinalNode",
  "decisionNode",
  "mergeNode",
  "forkNode",
  "joinNode",
]);

export const activityFlowFromExecutableOrControlNodeRule: UmlRule = {
  id: RULE_ID,
  diagramKinds: ["activity"],
  severity: "error",
  check(model: UmlModel): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    for (const relationship of model.relationships) {
      if (relationship.relationshipType !== "controlFlow") {
        continue;
      }

      const source = model.elements.find((element) => element.id === relationship.sourceId);
      const target = model.elements.find((element) => element.id === relationship.targetId);
      if (!source || !target) {
        continue;
      }

      if (
        !CONTROL_OR_EXECUTABLE.has(source.elementType) ||
        !CONTROL_OR_EXECUTABLE.has(target.elementType)
      ) {
        diagnostics.push({
          id: createId(),
          ruleId: RULE_ID,
          severity: "error",
          message:
            "Control flow must connect executable or control nodes, not object nodes, partitions, or notes",
          elementIds: [relationship.id, source.id, target.id],
        });
      }
    }

    return diagnostics;
  },
};
