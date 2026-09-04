import type { UmlRule } from "../../types.js";
import { deploymentCommPathBetweenNodesRule } from "./comm-path-between-nodes.js";
import { deploymentDeployArtifactToNodeRule } from "./deploy-artifact-to-node.js";
import { deploymentDeviceAndEeAreNodesRule } from "./device-and-ee-are-nodes.js";
import { deploymentNoUseCaseElementsRule } from "./no-usecase-elements.js";

export const DEPLOYMENT_RULES: readonly UmlRule[] = [
  deploymentDeployArtifactToNodeRule,
  deploymentCommPathBetweenNodesRule,
  deploymentDeviceAndEeAreNodesRule,
  deploymentNoUseCaseElementsRule,
];
