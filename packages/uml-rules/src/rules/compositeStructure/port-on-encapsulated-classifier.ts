import { createId } from "@graphiq/uml-core";
import type { Diagnostic } from "@graphiq/uml-core";
import type { UmlModel } from "@graphiq/uml-model";
import type { UmlRule } from "../../types.js";

const RULE_ID = "cs.port-on-encapsulated-classifier";

const VALID_PORT_PARENTS = new Set(["class", "component", "part"]);

export const compositeStructurePortOnClassifierRule: UmlRule = {
  id: RULE_ID,
  diagramKinds: ["compositeStructure"],
  severity: "error",
  check(model: UmlModel): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    for (const element of model.elements) {
      if (element.elementType !== "port") {
        continue;
      }

      if (element.parentId === undefined) {
        diagnostics.push({
          id: createId(),
          ruleId: RULE_ID,
          severity: "error",
          message: "Port must be placed on an encapsulated classifier or part",
          elementIds: [element.id],
        });
        continue;
      }

      const parent = model.elements.find((item) => item.id === element.parentId);
      if (!parent || !VALID_PORT_PARENTS.has(parent.elementType)) {
        diagnostics.push({
          id: createId(),
          ruleId: RULE_ID,
          severity: "error",
          message: "Port must be on the border of a class, component, or part",
          elementIds: [element.id, element.parentId],
        });
      }
    }

    return diagnostics;
  },
};
