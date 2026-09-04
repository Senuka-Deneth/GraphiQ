import { createId } from "@graphiq/uml-core";
import type { Diagnostic } from "@graphiq/uml-core";
import type { ElementType, UmlModel } from "@graphiq/uml-model";
import type { UmlRule } from "../../types.js";

const RULE_ID = "class.gen.same-metaclass";

const GENERALIZATION_COMPATIBLE_TYPES = new Set<ElementType>([
  "class",
  "interface",
  "dataType",
  "enumeration",
  "primitiveType",
]);

export const classGeneralizationSameMetaclassRule: UmlRule = {
  id: RULE_ID,
  diagramKinds: ["class"],
  severity: "error",
  check(model: UmlModel): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    for (const relationship of model.relationships) {
      if (relationship.relationshipType !== "generalization") {
        continue;
      }

      const source = model.elements.find(
        (element) => element.id === relationship.sourceId,
      );
      const target = model.elements.find(
        (element) => element.id === relationship.targetId,
      );

      if (!source || !target) {
        continue;
      }

      if (
        !GENERALIZATION_COMPATIBLE_TYPES.has(source.elementType) ||
        !GENERALIZATION_COMPATIBLE_TYPES.has(target.elementType) ||
        source.elementType !== target.elementType
      ) {
        diagnostics.push({
          id: createId(),
          ruleId: RULE_ID,
          severity: "error",
          message: `Generalization requires the same classifier kind; got ${source.elementType} to ${target.elementType}`,
          elementIds: [relationship.id, source.id, target.id],
        });
      }
    }

    return diagnostics;
  },
};
