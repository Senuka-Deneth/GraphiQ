export const DIAGRAM_KINDS = [
  "class",
  "object",
  "package",
  "compositeStructure",
  "component",
  "deployment",
  "profile",
  "useCase",
  "activity",
  "stateMachine",
  "sequence",
  "communication",
  "timing",
  "interactionOverview",
] as const;

export type DiagramKind = (typeof DIAGRAM_KINDS)[number];

const diagramKindSet = new Set<string>(DIAGRAM_KINDS);

export function isDiagramKind(value: string): value is DiagramKind {
  return diagramKindSet.has(value);
}
