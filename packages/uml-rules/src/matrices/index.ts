import { assertNever } from "@graphiq/uml-core";
import type { DiagramKind } from "@graphiq/uml-core";
import { ACTIVITY_CONNECTORS } from "./activity.js";
import { CLASS_CONNECTORS } from "./class.js";
import { COMMUNICATION_CONNECTORS } from "./communication.js";
import { COMPONENT_CONNECTORS } from "./component.js";
import { COMPOSITE_STRUCTURE_CONNECTORS } from "./compositeStructure.js";
import { DEPLOYMENT_CONNECTORS } from "./deployment.js";
import { INTERACTION_OVERVIEW_CONNECTORS } from "./interactionOverview.js";
import { OBJECT_CONNECTORS } from "./object.js";
import { PACKAGE_CONNECTORS } from "./package.js";
import { PROFILE_CONNECTORS } from "./profile.js";
import { SEQUENCE_CONNECTORS } from "./sequence.js";
import { STATE_MACHINE_CONNECTORS } from "./stateMachine.js";
import { TIMING_CONNECTORS } from "./timing.js";
import { USE_CASE_CONNECTORS } from "./useCase.js";
import type { ConnectorTriple } from "../types.js";

export { ACTIVITY_CONNECTORS } from "./activity.js";
export { CLASS_CONNECTORS } from "./class.js";
export { COMMUNICATION_CONNECTORS } from "./communication.js";
export { COMPONENT_CONNECTORS } from "./component.js";
export { COMPOSITE_STRUCTURE_CONNECTORS } from "./compositeStructure.js";
export { DEPLOYMENT_CONNECTORS } from "./deployment.js";
export { INTERACTION_OVERVIEW_CONNECTORS } from "./interactionOverview.js";
export { OBJECT_CONNECTORS } from "./object.js";
export { PACKAGE_CONNECTORS } from "./package.js";
export { PROFILE_CONNECTORS } from "./profile.js";
export { SEQUENCE_CONNECTORS } from "./sequence.js";
export { STATE_MACHINE_CONNECTORS } from "./stateMachine.js";
export { TIMING_CONNECTORS } from "./timing.js";
export { USE_CASE_CONNECTORS } from "./useCase.js";

export function getConnectorMatrix(kind: DiagramKind): readonly ConnectorTriple[] {
  switch (kind) {
    case "class":
      return CLASS_CONNECTORS;
    case "object":
      return OBJECT_CONNECTORS;
    case "package":
      return PACKAGE_CONNECTORS;
    case "compositeStructure":
      return COMPOSITE_STRUCTURE_CONNECTORS;
    case "component":
      return COMPONENT_CONNECTORS;
    case "deployment":
      return DEPLOYMENT_CONNECTORS;
    case "profile":
      return PROFILE_CONNECTORS;
    case "useCase":
      return USE_CASE_CONNECTORS;
    case "activity":
      return ACTIVITY_CONNECTORS;
    case "stateMachine":
      return STATE_MACHINE_CONNECTORS;
    case "sequence":
      return SEQUENCE_CONNECTORS;
    case "communication":
      return COMMUNICATION_CONNECTORS;
    case "timing":
      return TIMING_CONNECTORS;
    case "interactionOverview":
      return INTERACTION_OVERVIEW_CONNECTORS;
    default:
      return assertNever(kind);
  }
}
