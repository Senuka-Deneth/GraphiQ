import { createId } from "@graphiq/uml-core";
import type { Diagnostic } from "@graphiq/uml-core";
import type { UmlModel } from "@graphiq/uml-model";
import type { UmlRule } from "../../types.js";

const RULE_ID = "io.ref-names-an-interaction";

export const interactionOverviewRefNamesAnInteractionRule: UmlRule = {
  id: RULE_ID,
  diagramKinds: ["interactionOverview"],
  severity: "warning",
  check(model: UmlModel): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];
    const interactionNames = new Set(
      model.elements
        .filter((element) => element.elementType === "interaction")
        .map((element) => element.name),
    );

    for (const element of model.elements) {
      if (element.elementType !== "interactionUse") {
        continue;
      }

      if (interactionNames.has(element.name)) {
        continue;
      }

      diagnostics.push({
        id: createId(),
        ruleId: RULE_ID,
        severity: "warning",
        message: `Interaction "${element.name}" is not defined in this model (external interaction name)`,
        elementIds: [element.id],
      });
    }

    return diagnostics;
  },
};
