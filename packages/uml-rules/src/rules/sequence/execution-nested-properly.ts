import { createId } from "@graphiq/uml-core";
import type { Diagnostic } from "@graphiq/uml-core";
import type { UmlModel } from "@graphiq/uml-model";
import type { UmlRule } from "../../types.js";

const RULE_ID = "sd.execution-nested-properly";

export const sequenceExecutionNestedProperlyRule: UmlRule = {
  id: RULE_ID,
  diagramKinds: ["sequence"],
  severity: "error",
  check(model: UmlModel): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    for (const element of model.elements) {
      if (element.elementType !== "executionSpecification") {
        continue;
      }

      if (element.parentId === undefined) {
        diagnostics.push({
          id: createId(),
          ruleId: RULE_ID,
          severity: "error",
          message: "Execution specifications must be nested on a lifeline",
          elementIds: [element.id],
        });
        continue;
      }

      const parent = model.elements.find((item) => item.id === element.parentId);
      if (parent === undefined || parent.elementType !== "lifeline") {
        diagnostics.push({
          id: createId(),
          ruleId: RULE_ID,
          severity: "error",
          message: "Execution specifications must be nested on a lifeline",
          elementIds: [element.id, element.parentId],
        });
        continue;
      }

      if (element.startMessageId !== undefined) {
        const startMessage = model.relationships.find(
          (relationship) => relationship.id === element.startMessageId,
        );
        if (
          startMessage === undefined ||
          (startMessage.targetId !== element.parentId &&
            startMessage.sourceId !== element.parentId)
        ) {
          diagnostics.push({
            id: createId(),
            ruleId: RULE_ID,
            severity: "error",
            message: "Execution specification start message must belong to the covered lifeline",
            elementIds: [element.id, element.startMessageId],
          });
        }
      }

      if (element.finishMessageId !== undefined) {
        const finishMessage = model.relationships.find(
          (relationship) => relationship.id === element.finishMessageId,
        );
        if (
          finishMessage === undefined ||
          (finishMessage.targetId !== element.parentId &&
            finishMessage.sourceId !== element.parentId)
        ) {
          diagnostics.push({
            id: createId(),
            ruleId: RULE_ID,
            severity: "error",
            message: "Execution specification finish message must belong to the covered lifeline",
            elementIds: [element.id, element.finishMessageId],
          });
        }
      }
    }

    return diagnostics;
  },
};
