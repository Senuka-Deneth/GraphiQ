import { createId, type Diagnostic } from "@graphiq/uml-core";
import type { ControlFlowRelationship } from "@graphiq/uml-model";
import type { UmlRule } from "../../types.js";

export const activityBranchChoicesRule: UmlRule = {
  id: "act.branch-choices",
  diagramKinds: ["activity"],
  severity: "warning",
  check(model): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];
    for (const element of model.elements) {
      if (element.elementType !== "decisionNode" && element.elementType !== "action") continue;
      const outgoing = model.relationships.filter((flow): flow is ControlFlowRelationship => flow.relationshipType === "controlFlow" && flow.sourceId === element.id);
      if (element.elementType === "action" && outgoing.length > 1 && outgoing.every((flow) => !flow.guard?.trim())) {
        diagnostics.push({
          id: createId(), ruleId: "act.branch-choices", severity: "warning",
          message: `Action "${element.name}" has multiple outgoing paths. Use a decision for alternatives or a fork for parallel work.`,
          elementIds: [element.id],
        });
      }
      if (element.elementType !== "decisionNode") continue;
      const seen = new Set<string>();
      for (const flow of outgoing) {
        const guard = flow.guard?.trim();
        if (!guard) continue;
        if (seen.has(guard)) {
          diagnostics.push({
            id: createId(), ruleId: "act.branch-choices", severity: "warning",
            message: `Decision "${element.name}" uses [${guard}] on more than one path. Use distinct conditions or another decision to express the choice.`,
            elementIds: [flow.id, element.id],
          });
        }
        seen.add(guard);
      }
    }
    return diagnostics;
  },
};
