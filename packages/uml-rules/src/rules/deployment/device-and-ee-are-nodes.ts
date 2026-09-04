import { createId } from "@graphiq/uml-core";
import type { Diagnostic } from "@graphiq/uml-core";
import type { UmlModel } from "@graphiq/uml-model";
import type { UmlRule } from "../../types.js";

const RULE_ID = "dep.device-and-ee-are-nodes";

const NODEISH = new Set(["node", "device", "executionEnvironment"]);

export const deploymentDeviceAndEeAreNodesRule: UmlRule = {
  id: RULE_ID,
  diagramKinds: ["deployment"],
  severity: "error",
  check(model: UmlModel): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    for (const element of model.elements) {
      if (element.parentId === undefined) {
        continue;
      }

      const parent = model.elements.find((item) => item.id === element.parentId);
      if (parent !== undefined && NODEISH.has(parent.elementType)) {
        continue;
      }

      diagnostics.push({
        id: createId(),
        ruleId: RULE_ID,
        severity: "error",
        message: "Nested deployment elements must sit inside a node, device, or execution environment",
        elementIds: [element.id],
      });
    }

    return diagnostics;
  },
};
