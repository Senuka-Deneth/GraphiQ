import type { Diagnostic } from "@graphiq/uml-core";
import type { UmlModel } from "@graphiq/uml-model";
import type { UmlRule } from "../../types.js";

const RULE_ID = "sd.async-not-filled-arrow";

export const sequenceAsyncNotFilledArrowRule: UmlRule = {
  id: RULE_ID,
  diagramKinds: ["sequence"],
  severity: "error",
  check(_model: UmlModel): Diagnostic[] {
    return [];
  },
};
