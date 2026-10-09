import type { DslSpan } from "@graphiq/uml-core";
import type { ActivityDiagramAst, AstActivityBodyItem, AstActivityNode } from "@graphiq/uml-dsl";
import { emptyModel, type ElementType, type UmlElement, type UmlModel, type UmlRelationship } from "@graphiq/uml-model";
import { createBuildContext, type BuildContext } from "./identity.js";

function nodeKindToElementType(nodeKind: AstActivityNode["nodeKind"]): ElementType {
  // Activity AST node kinds use the same names as semantic element types.
  return nodeKind;
}

export function activityAstToModel(
  ast: ActivityDiagramAst,
  previous?: UmlModel,
  context?: BuildContext,
): UmlModel {
  const active = context ?? createBuildContext(previous);
  const identity = active.identity;
  const elements: UmlElement[] = previous?.elements.filter((element) => element.elementType === "note") ?? [];
  const relationships: UmlRelationship[] = [];
  const model: UmlModel = {
    id: previous?.id ?? emptyModel("activity").id,
    kind: "activity",
    elements,
    relationships,
  };

  function declare(elementType: ElementType, name: string, span?: DslSpan, parentId?: string): string {
    const claim = identity.allocateElement({ elementType, name, span, parentId });
    elements.push({
      id: claim.id, elementType, name,
      ...(parentId !== undefined ? { parentId } : {}),
    } as UmlElement);
    return claim.id;
  }

  function addBody(items: readonly AstActivityBodyItem[], parentId: string): void {
    for (const item of items) {
      if (item.itemKind === "node") {
        declare(nodeKindToElementType(item.node.nodeKind), item.node.name, item.node.span, parentId);
      } else if (item.itemKind === "partition") {
        const childId = declare("activityPartition", item.partition.name, item.partition.span, parentId);
        addBody(item.partition.items, childId);
      } else {
        const childId = declare("interruptibleActivityRegion", item.region.name, item.region.span, parentId);
        addBody(item.region.items, childId);
      }
    }
  }

  for (const partition of ast.partitions) {
    addBody(partition.items, declare("activityPartition", partition.name, partition.span));
  }
  for (const region of ast.interruptibles) {
    addBody(region.items, declare("interruptibleActivityRegion", region.name, region.span));
  }
  for (const node of ast.nodes) {
    declare(nodeKindToElementType(node.nodeKind), node.name, node.span);
  }

  const implicitTypes = new Map<string, ElementType>([
    ["initial", "initialNode"], ["final", "activityFinalNode"], ["flowFinal", "flowFinalNode"],
  ]);
  for (const flow of ast.flows) {
    for (const name of [flow.sourceName, flow.targetName]) {
      const implicitType = implicitTypes.get(name);
      if (implicitType !== undefined && !model.elements.some((element) => element.name === name)) {
        declare(implicitType, name);
      }
    }
    const sourceId = identity.resolve(model, flow.sourceName, flow.sourceSpan ?? flow.span);
    const targetId = identity.resolve(model, flow.targetName, flow.targetSpan ?? flow.span);
    if (sourceId === undefined || targetId === undefined) continue;

    const source = model.elements.find((element) => element.id === sourceId)!;
    const target = model.elements.find((element) => element.id === targetId)!;
    const relationshipType = source.elementType === "objectNode" || target.elementType === "objectNode"
      ? "objectFlow" : "controlFlow";
    const claim = identity.allocateRelationship({
      sourceId, targetId, relationshipType, discriminator: flow.guard, span: flow.span,
    });
    relationships.push({
      id: claim.id, relationshipType, sourceId, targetId, guard: flow.guard,
    });
  }
  return model;
}
