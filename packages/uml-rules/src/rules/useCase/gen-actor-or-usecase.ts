import { createId } from "@graphiq/uml-core";
import type { Diagnostic } from "@graphiq/uml-core";
import type { UmlModel } from "@graphiq/uml-model";
import type { UmlRule } from "../../types.js";

const RULE_ID = "uc.gen.actor-actor-or-uc-uc";

export const useCaseGenActorOrUseCaseRule: UmlRule = {
  id: RULE_ID,
  diagramKinds: ["useCase"],
  severity: "error",
  check(model: UmlModel): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    for (const relationship of model.relationships) {
      if (relationship.relationshipType !== "generalization") {
        continue;
      }

      const source = model.elements.find((element) => element.id === relationship.sourceId);
      const target = model.elements.find((element) => element.id === relationship.targetId);

      if (!source || !target) {
        continue;
      }

      const validPair =
        (source.elementType === "actor" && target.elementType === "actor") ||
        (source.elementType === "useCase" && target.elementType === "useCase");

      if (!validPair) {
        diagnostics.push({
          id: createId(),
          ruleId: RULE_ID,
          severity: "error",
          message: "Generalization on a use case diagram must be actor-to-actor or use case-to-use case",
          elementIds: [relationship.id, source.id, target.id],
        });
      }
    }

    return diagnostics;
  },
};
