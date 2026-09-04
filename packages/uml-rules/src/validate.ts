import { createId } from "@graphiq/uml-core";
import type { DiagramKind, Diagnostic } from "@graphiq/uml-core";
import { isElementAllowedOn } from "@graphiq/uml-model";
import type { UmlModel } from "@graphiq/uml-model";
import { isConnectorAllowed } from "./connectors.js";
import "./rules/index.js";
import { getRegisteredRules } from "./registry.js";

const ILLEGAL_CONNECTOR_RULE_ID = "rules.illegal-connector";
const ILLEGAL_ELEMENT_RULE_ID = "rules.illegal-element-on-diagram";

function validateConnectors(kind: DiagramKind, model: UmlModel): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  for (const relationship of model.relationships) {
    const source = model.elements.find(
      (element) => element.id === relationship.sourceId,
    );
    const target = model.elements.find(
      (element) => element.id === relationship.targetId,
    );

    if (!source || !target) {
      diagnostics.push({
        id: createId(),
        ruleId: ILLEGAL_CONNECTOR_RULE_ID,
        severity: "error",
        message:
          "Relationship endpoints must reference existing elements on the diagram",
        elementIds: [
          relationship.id,
          relationship.sourceId,
          relationship.targetId,
        ],
      });
      continue;
    }

    if (
      !isConnectorAllowed({
        kind,
        relationship: relationship.relationshipType,
        source: source.elementType,
        target: target.elementType,
      })
    ) {
      diagnostics.push({
        id: createId(),
        ruleId: ILLEGAL_CONNECTOR_RULE_ID,
        severity: "error",
        message: `Relationship "${relationship.relationshipType}" from ${source.elementType} to ${target.elementType} is not allowed on a ${kind} diagram`,
        elementIds: [
          relationship.id,
          relationship.sourceId,
          relationship.targetId,
        ],
      });
    }
  }

  return diagnostics;
}

function validateElementMembership(
  kind: DiagramKind,
  model: UmlModel,
): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  for (const element of model.elements) {
    if (!isElementAllowedOn(kind, element.elementType)) {
      diagnostics.push({
        id: createId(),
        ruleId: ILLEGAL_ELEMENT_RULE_ID,
        severity: "error",
        message: `Element type "${element.elementType}" is not allowed on a ${kind} diagram`,
        elementIds: [element.id],
      });
    }
  }

  return diagnostics;
}

function validateRegisteredRules(kind: DiagramKind, model: UmlModel): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  for (const rule of getRegisteredRules()) {
    if (!rule.diagramKinds.includes(kind)) {
      continue;
    }
    diagnostics.push(...rule.check(model));
  }

  return diagnostics;
}

export function validate(kind: DiagramKind, model: UmlModel): Diagnostic[] {
  return [
    ...validateConnectors(kind, model),
    ...validateElementMembership(kind, model),
    ...validateRegisteredRules(kind, model),
  ];
}
