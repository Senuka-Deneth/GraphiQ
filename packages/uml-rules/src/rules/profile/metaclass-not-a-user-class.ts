import { createId } from "@graphiq/uml-core";
import type { Diagnostic } from "@graphiq/uml-core";
import type { UmlModel } from "@graphiq/uml-model";
import type { UmlRule } from "../../types.js";
import { isProfileMetaclassName } from "./metaclasses.js";

const RULE_ID = "prf.metaclass-not-a-user-class";

export const profileMetaclassNotAUserClassRule: UmlRule = {
  id: RULE_ID,
  diagramKinds: ["profile"],
  severity: "error",
  check(model: UmlModel): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    for (const element of model.elements) {
      if (element.elementType !== "metaclass") {
        continue;
      }

      if (isProfileMetaclassName(element.name)) {
        continue;
      }

      diagnostics.push({
        id: createId(),
        ruleId: RULE_ID,
        severity: "error",
        message: `Metaclass "${element.name}" is not a UML metaclass from the closed list`,
        elementIds: [element.id],
      });
    }

    return diagnostics;
  },
};
