import { createId } from "@graphiq/uml-core";
import type { DiagramKind } from "@graphiq/uml-core";
import type { UmlElement } from "./element.js";
import type { UmlRelationship } from "./relationship.js";

export type UmlModel = {
  id: string;
  kind: DiagramKind;
  elements: readonly UmlElement[];
  relationships: readonly UmlRelationship[];
};

export function emptyModel(kind: DiagramKind): UmlModel {
  return {
    id: createId(),
    kind,
    elements: [],
    relationships: [],
  };
}
