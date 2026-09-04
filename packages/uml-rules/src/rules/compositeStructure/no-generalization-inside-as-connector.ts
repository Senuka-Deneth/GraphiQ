import { createId } from "@graphiq/uml-core";
import type { Diagnostic } from "@graphiq/uml-core";
import type { UmlModel } from "@graphiq/uml-model";
import type { UmlRule } from "../../types.js";

const RULE_ID = "cs.no-generalization-inside-as-connector";

export const compositeStructureNoGeneralizationRule: UmlRule = {
  id: RULE_ID,
  diagramKinds: ["compositeStructure"],
  severity: "error",
  check(model: UmlModel): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    for (const relationship of model.relationships) {
      if (relationship.relationshipType !== "generalization") {
        continue;
      }

      diagnostics.push({
        id: createId(),
        ruleId: RULE_ID,
        severity: "error",
        message: "Generalization is not allowed on composite structure diagrams",
        elementIds: [
          relationship.id,
          relationship.sourceId,
          relationship.targetId,
        ],
      });
    }

    return diagnostics;
  },
};
