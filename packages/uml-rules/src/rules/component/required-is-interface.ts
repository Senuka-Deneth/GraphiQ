import { createId } from "@graphiq/uml-core";
import type { Diagnostic } from "@graphiq/uml-core";
import type { UmlModel } from "@graphiq/uml-model";
import type { UmlRule } from "../../types.js";

const RULE_ID = "cmp.required-is-interface";

export const componentRequiredIsInterfaceRule: UmlRule = {
  id: RULE_ID,
  diagramKinds: ["component"],
  severity: "error",
  check(model: UmlModel): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    for (const relationship of model.relationships) {
      if (relationship.relationshipType !== "usage") {
        continue;
      }

      const source = model.elements.find((element) => element.id === relationship.sourceId);
      const target = model.elements.find((element) => element.id === relationship.targetId);
      if (source?.elementType === "component" && target?.elementType === "interface") {
        continue;
      }

      diagnostics.push({
        id: createId(),
        ruleId: RULE_ID,
        severity: "error",
        message: "Required usage must go from a component to an interface",
        elementIds: [relationship.id, relationship.sourceId, relationship.targetId],
      });
    }

    return diagnostics;
  },
};
