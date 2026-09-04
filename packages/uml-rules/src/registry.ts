import type { UmlRule } from "./types.js";

const registeredRules: UmlRule[] = [];

export function registerRule(rule: UmlRule): void {
  registeredRules.push(rule);
}

export function clearRegisteredRules(): void {
  registeredRules.length = 0;
}

export function getRegisteredRules(): readonly UmlRule[] {
  return registeredRules;
}
