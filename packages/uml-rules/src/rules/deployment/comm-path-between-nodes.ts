import { createId } from "@graphiq/uml-core";
import type { Diagnostic } from "@graphiq/uml-core";
import type { UmlModel } from "@graphiq/uml-model";
import type { UmlRule } from "../../types.js";

const RULE_ID = "dep.comm-path-between-nodes";

const NODEISH = new Set(["node", "device", "executionEnvironment"]);

export const deploymentCommPathBetweenNodesRule: UmlRule = {
  id: RULE_ID,
  diagramKinds: ["deployment"],
  severity: "error",
  check(model: UmlModel): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    for (const relationship of model.relationships) {
      if (relationship.relationshipType !== "communicationPath") {
        continue;
      }

      const source = model.elements.find((element) => element.id === relationship.sourceId);
      const target = model.elements.find((element) => element.id === relationship.targetId);
      if (
        source !== undefined &&
        target !== undefined &&
        NODEISH.has(source.elementType) &&
        NODEISH.has(target.elementType)
      ) {
        continue;
      }

      diagnostics.push({
        id: createId(),
        ruleId: RULE_ID,
        severity: "error",
        message: "Communication paths must connect nodes, devices, or execution environments",
        elementIds: [relationship.id, relationship.sourceId, relationship.targetId],
      });
    }

    return diagnostics;
  },
};
