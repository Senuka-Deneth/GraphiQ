import type { Diagnostic } from "@graphiq/uml-core";
import type { UmlModel } from "@graphiq/uml-model";
import type { UmlRule } from "../../types.js";

const RULE_ID = "prf.extension-marker-is-filled-triangle";

export const profileExtensionMarkerIsFilledTriangleRule: UmlRule = {
  id: RULE_ID,
  diagramKinds: ["profile"],
  severity: "error",
  check(_model: UmlModel): Diagnostic[] {
    return [];
  },
};
