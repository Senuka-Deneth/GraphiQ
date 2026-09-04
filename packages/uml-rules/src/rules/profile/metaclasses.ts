import { ELEMENT_TYPES } from "@graphiq/uml-model";

function toPascalCase(value: string): string {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}

const EXPLICIT_METACLASS_NAMES = [
  "Class",
  "Association",
  "Property",
  "Operation",
  "Actor",
  "UseCase",
  "Component",
  "Interface",
  "Package",
  "Artifact",
  "Node",
  "Constraint",
  "Dependency",
  "Generalization",
  "InstanceSpecification",
  "Port",
  "Activity",
  "Action",
  "State",
  "Lifeline",
  "Message",
  "Stereotype",
  "Profile",
  "Extension",
  "Classifier",
] as const;

export const PROFILE_METACLASS_NAMES: ReadonlySet<string> = new Set([
  ...ELEMENT_TYPES.map(toPascalCase),
  ...EXPLICIT_METACLASS_NAMES,
]);

export function isProfileMetaclassName(name: string): boolean {
  return PROFILE_METACLASS_NAMES.has(name);
}
