import type { Diagnostic } from "@graphiq/uml-core";
import type {
  ClassDiagramAst,
  ComponentDiagramAst,
  CommunicationDiagramAst,
  ActivityDiagramAst,
  CompositeStructureDiagramAst,
  DeploymentDiagramAst,
  DiagramAst,
  ObjectDiagramAst,
  PackageDiagramAst,
  ProfileDiagramAst,
  UseCaseDiagramAst,
} from "@graphiq/uml-dsl";
import type { UmlModel } from "@graphiq/uml-model";

function findClassRelationshipSpan(
  ast: ClassDiagramAst,
  sourceName: string,
  targetName: string,
  relationshipType: string,
) {
  return ast.relationships.find(
    (relationship) =>
      relationship.sourceName === sourceName &&
      relationship.targetName === targetName &&
      relationship.relationshipType === relationshipType,
  )?.span;
}

function findClassClassifierSpan(ast: ClassDiagramAst, name: string) {
  return ast.classifiers.find((classifier) => classifier.name === name)?.span;
}

function findObjectRelationshipSpan(
  ast: ObjectDiagramAst,
  sourceName: string,
  targetName: string,
  relationshipType: string,
) {
  return ast.relationships.find(
    (relationship) =>
      relationship.sourceName === sourceName &&
      relationship.targetName === targetName &&
      relationship.relationshipType === relationshipType,
  )?.span;
}

function findObjectInstanceSpan(ast: ObjectDiagramAst, name: string) {
  return ast.instances.find((instance) => instance.name === name)?.span;
}

function findPackageElementSpan(ast: PackageDiagramAst, name: string) {
  for (const pkg of ast.packages) {
    if (pkg.name === name) {
      return pkg.span;
    }
    for (const item of pkg.items) {
      if (item.itemKind === "nestedPackage" && item.name === name) {
        return item.span;
      }
      if (item.itemKind === "classifier" && item.classifier.name === name) {
        return item.span;
      }
    }
  }
  return undefined;
}

function findPackageRelationshipSpan(
  ast: PackageDiagramAst,
  sourceName: string,
  targetName: string,
  relationshipType: string,
) {
  return ast.relationships.find(
    (relationship) =>
      relationship.sourceName === sourceName &&
      relationship.targetName === targetName &&
      relationship.relationshipType === relationshipType,
  )?.span;
}

function findComponentElementSpan(ast: ComponentDiagramAst, name: string) {
  for (const component of ast.components) {
    if (component.name === name) {
      return component.span;
    }
    for (const item of component.items) {
      if (item.name === name) {
        return item.span;
      }
    }
  }
  return undefined;
}

function findComponentRelationshipSpan(
  ast: ComponentDiagramAst,
  sourceName: string,
  targetName: string,
  relationshipType: string,
) {
  for (const relationship of ast.relationships) {
    if (relationship.relationshipKind === "assembly") {
      if (relationshipType !== "assemblyConnector") {
        continue;
      }
      if (
        relationship.sourceInterfaceName === sourceName &&
        relationship.targetInterfaceName === targetName
      ) {
        return relationship.span;
      }
      continue;
    }

    if (
      relationship.relationshipKind === "dependency" &&
      relationshipType === "dependency" &&
      relationship.sourceName === sourceName &&
      relationship.targetName === targetName
    ) {
      return relationship.span;
    }

    if (
      relationship.relationshipKind === "delegation" &&
      relationshipType === "delegationConnector" &&
      relationship.sourceName === sourceName &&
      relationship.targetName === targetName
    ) {
      return relationship.span;
    }
  }
  return undefined;
}

function findDeploymentElementSpan(ast: DeploymentDiagramAst, name: string) {
  for (const node of ast.nodes) {
    if (node.name === name) {
      return node.span;
    }
    for (const item of node.items) {
      if (item.name === name) {
        return item.span;
      }
    }
  }
  return undefined;
}

function findDeploymentRelationshipSpan(
  ast: DeploymentDiagramAst,
  sourceName: string,
  targetName: string,
  relationshipType: string,
) {
  return ast.relationships.find(
    (relationship) =>
      relationship.relationshipKind === relationshipType &&
      relationship.sourceName === sourceName &&
      relationship.targetName === targetName,
  )?.span;
}

function findProfileElementSpan(ast: ProfileDiagramAst, name: string) {
  const stereotype = ast.stereotypes.find((item) => item.name === name);
  if (stereotype !== undefined) {
    return stereotype.span;
  }
  const metaclass = ast.metaclasses.find((item) => item.name === name);
  if (metaclass !== undefined) {
    return metaclass.span;
  }
  const profile = ast.profiles.find((item) => item.name === name);
  if (profile !== undefined) {
    return profile.span;
  }
  const enumeration = ast.enumerations.find((item) => item.name === name);
  if (enumeration !== undefined) {
    return enumeration.span;
  }
  for (const item of ast.stereotypes) {
    for (const attribute of item.attributes) {
      if (attribute.name === name) {
        return attribute.span;
      }
    }
  }
  return undefined;
}

function findProfileRelationshipSpan(
  ast: ProfileDiagramAst,
  sourceName: string,
  targetName: string,
  relationshipType: string,
) {
  return ast.relationships.find(
    (relationship) =>
      relationship.relationshipKind === relationshipType &&
      relationship.sourceName === sourceName &&
      relationship.targetName === targetName,
  )?.span;
}

function findUseCaseElementSpan(ast: UseCaseDiagramAst, name: string) {
  const actor = ast.actors.find((item) => item.name === name);
  if (actor !== undefined) {
    return actor.span;
  }

  for (const subject of ast.subjects) {
    if (subject.name === name) {
      return subject.span;
    }
    for (const useCase of subject.useCases) {
      if (useCase.name === name) {
        return useCase.span;
      }
    }
  }

  const standalone = ast.useCases.find((item) => item.name === name);
  if (standalone !== undefined) {
    return standalone.span;
  }

  return undefined;
}

function findUseCaseRelationshipSpan(
  ast: UseCaseDiagramAst,
  sourceName: string,
  targetName: string,
  relationshipType: string,
) {
  return ast.relationships.find(
    (relationship) =>
      relationship.sourceName === sourceName &&
      relationship.targetName === targetName &&
      relationship.relationshipType === relationshipType,
  )?.span;
}

function findCompositeStructureElementSpan(ast: CompositeStructureDiagramAst, name: string) {
  for (const frame of ast.frames) {
    if (frame.name === name) {
      return frame.span;
    }
    for (const item of frame.items) {
      if (item.name === name) {
        return item.span;
      }
    }
  }

  return undefined;
}

function findCompositeStructureConnectorSpan(ast: CompositeStructureDiagramAst, name: string) {
  return ast.connectors.find((connector) => connector.name === name)?.span;
}

function findCommunicationInstanceSpan(ast: CommunicationDiagramAst, name: string) {
  return ast.instances.find((instance) => instance.name === name)?.span;
}

function findCommunicationMessageSpan(
  ast: CommunicationDiagramAst,
  sourceName: string,
  targetName: string,
  sequenceNumber?: string,
) {
  return ast.messages.find(
    (message) =>
      message.sourceName === sourceName &&
      message.targetName === targetName &&
      (sequenceNumber === undefined || message.sequenceNumber === sequenceNumber),
  )?.span;
}

function findActivityElementSpan(ast: ActivityDiagramAst, name: string) {
  const topLevel = ast.nodes.find((node) => node.name === name);
  if (topLevel !== undefined) {
    return topLevel.span;
  }
  for (const partition of ast.partitions) {
    const found = findActivityBodySpan(partition.items, name);
    if (found !== undefined) {
      return found;
    }
    if (partition.name === name) {
      return partition.span;
    }
  }
  for (const region of ast.interruptibles) {
    const found = findActivityBodySpan(region.items, name);
    if (found !== undefined) {
      return found;
    }
    if (region.name === name) {
      return region.span;
    }
  }
  return undefined;
}

function findActivityBodySpan(
  items: ActivityDiagramAst["partitions"][number]["items"],
  name: string,
): { start: number; end: number } | undefined {
  for (const item of items) {
    switch (item.itemKind) {
      case "node":
        if (item.node.name === name) {
          return item.node.span;
        }
        break;
      case "partition":
        if (item.partition.name === name) {
          return item.partition.span;
        }
        {
          const nested = findActivityBodySpan(item.partition.items, name);
          if (nested !== undefined) {
            return nested;
          }
        }
        break;
      case "interruptible":
        if (item.region.name === name) {
          return item.region.span;
        }
        {
          const nested = findActivityBodySpan(item.region.items, name);
          if (nested !== undefined) {
            return nested;
          }
        }
        break;
      default: {
        const unreachable: never = item;
        throw new Error(`Unhandled activity body item: ${String(unreachable)}`);
      }
    }
  }
  return undefined;
}

function findActivityFlowSpan(
  ast: ActivityDiagramAst,
  sourceName: string,
  targetName: string,
) {
  return ast.flows.find(
    (flow) => flow.sourceName === sourceName && flow.targetName === targetName,
  )?.span;
}

function bindOneDiagnostic(
  ast: DiagramAst,
  model: UmlModel,
  diagnostic: Diagnostic,
): Diagnostic {
  if (diagnostic.dslSpan !== undefined) {
    return diagnostic;
  }

  const nameById = new Map(model.elements.map((element) => [element.id, element.name]));

  for (const elementId of diagnostic.elementIds) {
    const relationship = model.relationships.find((item) => item.id === elementId);
    if (relationship !== undefined) {
      const sourceName = nameById.get(relationship.sourceId);
      const targetName = nameById.get(relationship.targetId);
      if (sourceName !== undefined && targetName !== undefined) {
        const span =
          ast.kind === "class"
            ? findClassRelationshipSpan(
                ast,
                sourceName,
                targetName,
                relationship.relationshipType,
              )
            : ast.kind === "object"
              ? findObjectRelationshipSpan(
                  ast,
                  sourceName,
                  targetName,
                  relationship.relationshipType,
                )
              : ast.kind === "package"
                ? findPackageRelationshipSpan(
                    ast,
                    sourceName,
                    targetName,
                    relationship.relationshipType,
                  )
                : ast.kind === "component"
                  ? findComponentRelationshipSpan(
                      ast,
                      sourceName,
                      targetName,
                      relationship.relationshipType,
                    )
                : ast.kind === "deployment"
                  ? findDeploymentRelationshipSpan(
                      ast,
                      sourceName,
                      targetName,
                      relationship.relationshipType,
                    )
                : ast.kind === "profile"
                  ? findProfileRelationshipSpan(
                      ast,
                      sourceName,
                      targetName,
                      relationship.relationshipType,
                    )
                  : ast.kind === "useCase"
                    ? findUseCaseRelationshipSpan(
                        ast,
                        sourceName,
                        targetName,
                        relationship.relationshipType,
                      )
                    : ast.kind === "compositeStructure" &&
                        relationship.name !== undefined
                      ? findCompositeStructureConnectorSpan(ast, relationship.name)
                      : ast.kind === "communication" &&
                          relationship.relationshipType === "message"
                        ? findCommunicationMessageSpan(
                            ast,
                            sourceName,
                            targetName,
                            relationship.sequenceNumber,
                          )
                        : ast.kind === "activity"
                          ? findActivityFlowSpan(ast, sourceName, targetName)
                        : undefined;
        if (span !== undefined) {
          return { ...diagnostic, dslSpan: span };
        }
      }
    }

    const element = model.elements.find((item) => item.id === elementId);
    if (element !== undefined) {
      const span =
        ast.kind === "class"
          ? findClassClassifierSpan(ast, element.name)
          : ast.kind === "object"
            ? findObjectInstanceSpan(ast, element.name)
            : ast.kind === "package"
              ? findPackageElementSpan(ast, element.name)
              : ast.kind === "component"
                ? findComponentElementSpan(ast, element.name)
                : ast.kind === "deployment"
                  ? findDeploymentElementSpan(ast, element.name)
                : ast.kind === "profile"
                  ? findProfileElementSpan(ast, element.name)
                  : ast.kind === "useCase"
                    ? findUseCaseElementSpan(ast, element.name)
                    : ast.kind === "compositeStructure"
                      ? findCompositeStructureElementSpan(ast, element.name)
                      : ast.kind === "communication"
                        ? findCommunicationInstanceSpan(ast, element.name)
                        : ast.kind === "activity"
                          ? findActivityElementSpan(ast, element.name)
                        : undefined;
      if (span !== undefined) {
        return { ...diagnostic, dslSpan: span };
      }
    }
  }

  return diagnostic;
}

export function bindDiagnosticSpans(
  ast: DiagramAst,
  model: UmlModel,
  diagnostics: readonly Diagnostic[],
): Diagnostic[] {
  return diagnostics.map((diagnostic) => bindOneDiagnostic(ast, model, diagnostic));
}

export type DiagnosticSeverity = "error" | "warning";

export function buildDiagnosticSeverityMap(
  diagnostics: readonly Diagnostic[],
): Map<string, DiagnosticSeverity> {
  const map = new Map<string, DiagnosticSeverity>();

  for (const diagnostic of diagnostics) {
    for (const elementId of diagnostic.elementIds) {
      const existing = map.get(elementId);
      if (existing === "error") {
        continue;
      }
      if (diagnostic.severity === "error") {
        map.set(elementId, "error");
      } else if (existing === undefined) {
        map.set(elementId, "warning");
      }
    }
  }

  return map;
}
