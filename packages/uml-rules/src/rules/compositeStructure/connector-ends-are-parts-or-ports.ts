import { createId } from "@graphiq/uml-core";
import type { Diagnostic } from "@graphiq/uml-core";
import type { UmlModel } from "@graphiq/uml-model";
import type { UmlRule } from "../../types.js";

const RULE_ID = "cs.connector-ends-are-parts-or-ports";

const VALID_ENDPOINTS = new Set(["part", "port"]);

export const compositeStructureConnectorEndsRule: UmlRule = {
  id: RULE_ID,
  diagramKinds: ["compositeStructure"],
  severity: "error",
  check(model: UmlModel): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    for (const relationship of model.relationships) {
      if (
        relationship.relationshipType !== "connector" &&
        relationship.relationshipType !== "assemblyConnector"
      ) {
        continue;
      }

      const source = model.elements.find((element) => element.id === relationship.sourceId);
      const target = model.elements.find((element) => element.id === relationship.targetId);

      if (!source || !target) {
        continue;
      }

      if (!VALID_ENDPOINTS.has(source.elementType) || !VALID_ENDPOINTS.has(target.elementType)) {
        diagnostics.push({
          id: createId(),
          ruleId: RULE_ID,
          severity: "error",
          message: "Connectors must join parts or ports",
          elementIds: [relationship.id, source.id, target.id],
        });
      }
    }

    return diagnostics;
  },
};
