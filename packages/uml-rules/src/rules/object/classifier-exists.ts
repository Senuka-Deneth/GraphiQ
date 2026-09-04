import { createId } from "@graphiq/uml-core";
import type { Diagnostic } from "@graphiq/uml-core";
import type { UmlModel } from "@graphiq/uml-model";
import type { UmlRule } from "../../types.js";

const RULE_ID = "object.classifier-exists";

export const objectClassifierExistsRule: UmlRule = {
  id: RULE_ID,
  diagramKinds: ["object"],
  severity: "warning",
  check(model: UmlModel): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];
    const classifierNames = new Set(
      model.elements
        .filter(
          (element) =>
            element.elementType === "class" ||
            element.elementType === "interface" ||
            element.elementType === "dataType" ||
            element.elementType === "enumeration" ||
            element.elementType === "primitiveType",
        )
        .map((element) => element.name),
    );

    for (const element of model.elements) {
      if (element.elementType !== "instanceSpecification") {
        continue;
      }

      if (classifierNames.has(element.classifierName)) {
        continue;
      }

      diagnostics.push({
        id: createId(),
        ruleId: RULE_ID,
        severity: "warning",
        message: `Classifier "${element.classifierName}" is not defined in this model (external type name)`,
        elementIds: [element.id],
      });
    }

    return diagnostics;
  },
};
