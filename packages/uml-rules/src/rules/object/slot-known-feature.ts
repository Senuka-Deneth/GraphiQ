import { createId } from "@graphiq/uml-core";
import type { Diagnostic } from "@graphiq/uml-core";
import type { UmlModel } from "@graphiq/uml-model";
import type { UmlRule } from "../../types.js";

const RULE_ID = "object.slot-known-structural-feature";

export const objectSlotKnownFeatureRule: UmlRule = {
  id: RULE_ID,
  diagramKinds: ["object"],
  severity: "warning",
  check(model: UmlModel): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    for (const element of model.elements) {
      if (element.elementType !== "instanceSpecification") {
        continue;
      }

      const classifier = model.elements.find(
        (item) =>
          (item.elementType === "class" ||
            item.elementType === "interface" ||
            item.elementType === "dataType") &&
          item.name === element.classifierName,
      );

      if (
        classifier === undefined ||
        (classifier.elementType !== "class" &&
          classifier.elementType !== "interface" &&
          classifier.elementType !== "dataType")
      ) {
        continue;
      }

      const attributeNames = new Set(classifier.attributes.map((attribute) => attribute.name));

      for (const slot of element.slots) {
        if (attributeNames.has(slot.featureName)) {
          continue;
        }

        diagnostics.push({
          id: createId(),
          ruleId: RULE_ID,
          severity: "warning",
          message: `Slot "${slot.featureName}" on instance "${element.name}" does not match an attribute of classifier "${element.classifierName}"`,
          elementIds: [element.id],
        });
      }
    }

    return diagnostics;
  },
};
