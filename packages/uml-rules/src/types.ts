import type { DiagramKind, Diagnostic, Severity } from "@graphiq/uml-core";
import type { ElementType, RelationshipType, UmlModel } from "@graphiq/uml-model";

export type UmlRule = {
  id: string;
  diagramKinds: DiagramKind[];
  severity: Severity;
  check: (model: UmlModel) => Diagnostic[];
};

export type ConnectorKey = {
  kind: DiagramKind;
  relationship: RelationshipType;
  source: ElementType;
  target: ElementType;
};

export type ConnectorTriple = {
  relationship: RelationshipType;
  source: ElementType;
  target: ElementType;
};
