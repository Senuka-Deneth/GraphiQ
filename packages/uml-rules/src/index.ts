export { isConnectorAllowed } from "./connectors.js";
export { getConnectorMatrix } from "./matrices/index.js";
export {
  clearRegisteredRules,
  getRegisteredRules,
  registerRule,
} from "./registry.js";
export { registerClassRules } from "./rules/class/index.js";
export type { ConnectorKey, ConnectorTriple, UmlRule } from "./types.js";
export { validate } from "./validate.js";
