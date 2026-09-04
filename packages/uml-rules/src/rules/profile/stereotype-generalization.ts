import { createId } from "@graphiq/uml-core";
import type { Diagnostic } from "@graphiq/uml-core";
import type { UmlModel } from "@graphiq/uml-model";
import type { UmlRule } from "../../types.js";

const RULE_ID = "prf.stereotype-generalization-stereotype-to-stereotype";

export const profileStereotypeGeneralizationRule: UmlRule = {
  id: RULE_ID,
  diagramKinds: ["profile"],
  severity: "error",
  check(model: UmlModel): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    for (const relationship of model.relationships) {
      if (relationship.relationshipType !== "generalization") {
        continue;
      }

      const source = model.elements.find((element) => element.id === relationship.sourceId);
      const target = model.elements.find((element) => element.id === relationship.targetId);
      if (source?.elementType === "stereotype" && target?.elementType === "stereotype") {
        continue;
      }

      diagnostics.push({
        id: createId(),
        ruleId: RULE_ID,
        severity: "error",
        message: "Stereotype generalization must connect two stereotypes",
        elementIds: [relationship.id, relationship.sourceId, relationship.targetId],
      });
    }

    return diagnostics;
  },
};
