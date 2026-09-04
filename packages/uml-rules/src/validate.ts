import { assertNever, createId } from "@graphiq/uml-core";
import type { DiagramKind, Diagnostic } from "@graphiq/uml-core";
import { isElementAllowedOn } from "@graphiq/uml-model";
import type { UmlModel } from "@graphiq/uml-model";
import { isConnectorAllowed } from "./connectors.js";
import { getRegisteredRules } from "./registry.js";
import { CLASS_RULES } from "./rules/class/index.js";
import { COMPONENT_RULES } from "./rules/component/index.js";
import { DEPLOYMENT_RULES } from "./rules/deployment/index.js";
import { OBJECT_RULES } from "./rules/object/index.js";
import { PACKAGE_RULES } from "./rules/package/index.js";
import type { UmlRule } from "./types.js";

const ILLEGAL_CONNECTOR_RULE_ID = "rules.illegal-connector";
const ILLEGAL_ELEMENT_RULE_ID = "rules.illegal-element-on-diagram";

function builtinRulesFor(kind: DiagramKind): readonly UmlRule[] {
  switch (kind) {
    case "class":
      return CLASS_RULES;
    case "object":
      return OBJECT_RULES;
    case "package":
      return PACKAGE_RULES;
    case "component":
      return COMPONENT_RULES;
    case "deployment":
      return DEPLOYMENT_RULES;
    case "compositeStructure":
    case "profile":
    case "useCase":
    case "activity":
    case "stateMachine":
    case "sequence":
    case "communication":
    case "timing":
    case "interactionOverview":
      return [];
    default:
      return assertNever(kind);
  }
}

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

function validateRules(kind: DiagramKind, model: UmlModel): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const rules = [...builtinRulesFor(kind), ...getRegisteredRules()];

  for (const rule of rules) {
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
    ...validateRules(kind, model),
  ];
}
