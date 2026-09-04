import { createId } from "@graphiq/uml-core";
import type { Diagnostic } from "@graphiq/uml-core";
import type { UmlModel } from "@graphiq/uml-model";
import type { UmlRule } from "../../types.js";

const RULE_ID = "sd.create-target-is-lifeline";

export const sequenceCreateTargetIsLifelineRule: UmlRule = {
  id: RULE_ID,
  diagramKinds: ["sequence"],
  severity: "error",
  check(model: UmlModel): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    for (const relationship of model.relationships) {
      if (
        relationship.relationshipType !== "message" ||
        relationship.messageSort !== "createMessage"
      ) {
        continue;
      }

      const target = model.elements.find((element) => element.id === relationship.targetId);
      if (target === undefined || target.elementType !== "lifeline") {
        diagnostics.push({
          id: createId(),
          ruleId: RULE_ID,
          severity: "error",
          message: "Create messages must target a lifeline",
          elementIds: [relationship.id, relationship.targetId],
        });
      }
    }

    return diagnostics;
  },
};
