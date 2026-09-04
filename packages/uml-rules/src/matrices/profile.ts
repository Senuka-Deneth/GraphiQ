import type { ConnectorTriple } from "../types.js";

export const PROFILE_CONNECTORS: readonly ConnectorTriple[] = [
  { relationship: "extension", source: "stereotype", target: "metaclass" },
  { relationship: "generalization", source: "stereotype", target: "stereotype" },
];
