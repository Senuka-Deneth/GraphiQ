import { createId } from "@graphiq/uml-core";
import type { Diagnostic } from "@graphiq/uml-core";
import {
  isAssociationFamilyRelationship,
  type UmlModel,
  type UmlRelationship,
} from "@graphiq/uml-model";
import type { UmlRule } from "../../types.js";

const RULE_ID = "class.assoc.multiplicity-syntax";

const MULTIPLICITY_PATTERN =
  /^(\d+|\*)(\.\.(\d+|\*))?$/;

function parseMultiplicity(value: string): { lower: number | "*"; upper: number | "*" } | null {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }

  const match = MULTIPLICITY_PATTERN.exec(trimmed);
  if (!match) {
    return null;
  }

  const lowerToken = match[1];
  if (lowerToken === undefined) {
    return null;
  }
  const upperToken = match[3];

  const lower =
    lowerToken === "*" ? "*" : Number.parseInt(lowerToken, 10);
  if (lower !== "*" && Number.isNaN(lower)) {
    return null;
  }

  if (upperToken === undefined) {
    return { lower, upper: lower };
  }

  const upper =
    upperToken === "*" ? "*" : Number.parseInt(upperToken, 10);
  if (upper !== "*" && Number.isNaN(upper)) {
    return null;
  }

  if (
    typeof lower === "number" &&
    typeof upper === "number" &&
    lower > upper
  ) {
    return null;
  }

  return { lower, upper };
}

function multiplicityDiagnostics(
  relationship: UmlRelationship,
  value: string,
  end: "source" | "target",
): Diagnostic | null {
  if (parseMultiplicity(value) !== null) {
    return null;
  }

  return {
    id: createId(),
    ruleId: RULE_ID,
    severity: "error",
    message: `Invalid ${end} multiplicity "${value}" on relationship "${relationship.relationshipType}"`,
    elementIds: [relationship.id],
  };
}

export const classMultiplicitySyntaxRule: UmlRule = {
  id: RULE_ID,
  diagramKinds: ["class"],
  severity: "error",
  check(model: UmlModel): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    for (const relationship of model.relationships) {
      if (!isAssociationFamilyRelationship(relationship)) {
        continue;
      }

      const sourceDiagnostic = multiplicityDiagnostics(
        relationship,
        relationship.sourceMultiplicity,
        "source",
      );
      if (sourceDiagnostic) {
        diagnostics.push(sourceDiagnostic);
      }

      const targetDiagnostic = multiplicityDiagnostics(
        relationship,
        relationship.targetMultiplicity,
        "target",
      );
      if (targetDiagnostic) {
        diagnostics.push(targetDiagnostic);
      }
    }

    return diagnostics;
  },
};
