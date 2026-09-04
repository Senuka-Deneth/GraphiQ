import type { ConnectorTriple } from "../types.js";

export const USE_CASE_CONNECTORS: readonly ConnectorTriple[] = [
  { relationship: "association", source: "actor", target: "useCase" },
  { relationship: "association", source: "useCase", target: "actor" },
  { relationship: "include", source: "useCase", target: "useCase" },
  { relationship: "extend", source: "useCase", target: "useCase" },
  { relationship: "generalization", source: "actor", target: "actor" },
  { relationship: "generalization", source: "useCase", target: "useCase" },
];
