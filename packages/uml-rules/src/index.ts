export { isConnectorAllowed } from "./connectors.js";
export { getConnectorMatrix } from "./matrices/index.js";
export {
  clearRegisteredRules,
  getRegisteredRules,
  registerRule,
} from "./registry.js";
export { CLASS_RULES } from "./rules/class/index.js";
export { OBJECT_RULES } from "./rules/object/index.js";
export { PACKAGE_RULES } from "./rules/package/index.js";
export { COMPONENT_RULES } from "./rules/component/index.js";
export { DEPLOYMENT_RULES } from "./rules/deployment/index.js";
export type { ConnectorKey, ConnectorTriple, UmlRule } from "./types.js";
export { validate } from "./validate.js";
