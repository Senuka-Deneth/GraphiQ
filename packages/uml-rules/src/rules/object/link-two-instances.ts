import { createId } from "@graphiq/uml-core";
import type { Diagnostic } from "@graphiq/uml-core";
import type { UmlModel } from "@graphiq/uml-model";
import type { UmlRule } from "../../types.js";

const RULE_ID = "object.link-two-instances";

export const objectLinkTwoInstancesRule: UmlRule = {
  id: RULE_ID,
  diagramKinds: ["object"],
  severity: "error",
  check(model: UmlModel): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    for (const relationship of model.relationships) {
      if (relationship.relationshipType !== "link") {
        continue;
      }

      const source = model.elements.find((element) => element.id === relationship.sourceId);
      const target = model.elements.find((element) => element.id === relationship.targetId);

      if (!source || !target) {
        continue;
      }

      if (
        source.elementType !== "instanceSpecification" ||
        target.elementType !== "instanceSpecification"
      ) {
        diagnostics.push({
          id: createId(),
          ruleId: RULE_ID,
          severity: "error",
          message: `Links must connect instance specifications; got ${source.elementType} to ${target.elementType}`,
          elementIds: [relationship.id, source.id, target.id],
        });
      }
    }

    return diagnostics;
  },
};
