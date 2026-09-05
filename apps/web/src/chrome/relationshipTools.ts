import { assertNever } from "@graphiq/uml-core";
import type {
  ActivityRelationshipTool,
  ClassRelationshipTool,
  CommunicationRelationshipTool,
  ComponentRelationshipTool,
  CompositeStructureRelationshipTool,
  DeploymentRelationshipTool,
  ImplementedDiagramKind,
  InteractionOverviewRelationshipTool,
  ObjectRelationshipTool,
  PackageRelationshipTool,
  ProfileRelationshipTool,
  RelationshipTool,
  SequenceRelationshipTool,
  StateMachineRelationshipTool,
  TimingRelationshipTool,
  UseCaseRelationshipTool,
} from "../store/documentStore.js";

export type RelationshipToolItem<T extends RelationshipTool = RelationshipTool> = {
  id: T;
  label: string;
};

const CLASS_RELATIONSHIP_TOOLS: readonly RelationshipToolItem<ClassRelationshipTool>[] = [
  { id: "association", label: "Association" },
  { id: "aggregation", label: "Aggregation" },
  { id: "composition", label: "Composition" },
  { id: "generalization", label: "Generalization" },
  { id: "realization", label: "Realization" },
  { id: "dependency", label: "Dependency" },
];

const OBJECT_RELATIONSHIP_TOOLS: readonly RelationshipToolItem<ObjectRelationshipTool>[] = [
  { id: "link", label: "Link" },
  { id: "dependency", label: "Dependency" },
];

const PACKAGE_RELATIONSHIP_TOOLS: readonly RelationshipToolItem<PackageRelationshipTool>[] = [
  { id: "packageImport", label: "Import" },
  { id: "packageMerge", label: "Merge" },
  { id: "dependency", label: "Dependency" },
];

const COMPONENT_RELATIONSHIP_TOOLS: readonly RelationshipToolItem<ComponentRelationshipTool>[] = [
  { id: "interfaceRealization", label: "Provided" },
  { id: "usage", label: "Required" },
  { id: "assemblyConnector", label: "Assembly" },
  { id: "delegationConnector", label: "Delegation" },
  { id: "dependency", label: "Dependency" },
];

const DEPLOYMENT_RELATIONSHIP_TOOLS: readonly RelationshipToolItem<DeploymentRelationshipTool>[] = [
  { id: "communicationPath", label: "Communication path" },
  { id: "deployment", label: "Deploy" },
  { id: "generalization", label: "Generalization" },
];

const PROFILE_RELATIONSHIP_TOOLS: readonly RelationshipToolItem<ProfileRelationshipTool>[] = [
  { id: "extension", label: "Extension" },
  { id: "generalization", label: "Generalization" },
];

const USE_CASE_RELATIONSHIP_TOOLS: readonly RelationshipToolItem<UseCaseRelationshipTool>[] = [
  { id: "association", label: "Association" },
  { id: "include", label: "Include" },
  { id: "extend", label: "Extend" },
  { id: "generalization", label: "Generalization" },
];

const COMPOSITE_STRUCTURE_RELATIONSHIP_TOOLS: readonly RelationshipToolItem<CompositeStructureRelationshipTool>[] =
  [
    { id: "connector", label: "Connector" },
    { id: "assemblyConnector", label: "Assembly" },
    { id: "dependency", label: "Dependency" },
  ];

const COMMUNICATION_RELATIONSHIP_TOOLS: readonly RelationshipToolItem<CommunicationRelationshipTool>[] =
  [
    { id: "message", label: "Message" },
    { id: "link", label: "Link" },
  ];

const ACTIVITY_RELATIONSHIP_TOOLS: readonly RelationshipToolItem<ActivityRelationshipTool>[] = [
  { id: "controlFlow", label: "Control flow" },
  { id: "objectFlow", label: "Object flow" },
];

const STATE_MACHINE_RELATIONSHIP_TOOLS: readonly RelationshipToolItem<StateMachineRelationshipTool>[] =
  [{ id: "transition", label: "Transition" }];

const SEQUENCE_RELATIONSHIP_TOOLS: readonly RelationshipToolItem<SequenceRelationshipTool>[] = [
  { id: "synchCall", label: "Sync call" },
  { id: "asynchCall", label: "Async call" },
  { id: "reply", label: "Reply" },
  { id: "createMessage", label: "Create" },
];

const TIMING_RELATIONSHIP_TOOLS: readonly RelationshipToolItem<TimingRelationshipTool>[] = [
  { id: "synchCall", label: "Sync call" },
  { id: "asynchCall", label: "Async call" },
  { id: "reply", label: "Reply" },
];

const INTERACTION_OVERVIEW_RELATIONSHIP_TOOLS: readonly RelationshipToolItem<InteractionOverviewRelationshipTool>[] =
  [{ id: "controlFlow", label: "Control flow" }];

export function relationshipToolsForKind(
  diagramKind: ImplementedDiagramKind,
): readonly RelationshipToolItem[] {
  switch (diagramKind) {
    case "class":
      return CLASS_RELATIONSHIP_TOOLS;
    case "object":
      return OBJECT_RELATIONSHIP_TOOLS;
    case "package":
      return PACKAGE_RELATIONSHIP_TOOLS;
    case "component":
      return COMPONENT_RELATIONSHIP_TOOLS;
    case "deployment":
      return DEPLOYMENT_RELATIONSHIP_TOOLS;
    case "profile":
      return PROFILE_RELATIONSHIP_TOOLS;
    case "useCase":
      return USE_CASE_RELATIONSHIP_TOOLS;
    case "compositeStructure":
      return COMPOSITE_STRUCTURE_RELATIONSHIP_TOOLS;
    case "communication":
      return COMMUNICATION_RELATIONSHIP_TOOLS;
    case "activity":
      return ACTIVITY_RELATIONSHIP_TOOLS;
    case "stateMachine":
      return STATE_MACHINE_RELATIONSHIP_TOOLS;
    case "sequence":
      return SEQUENCE_RELATIONSHIP_TOOLS;
    case "timing":
      return TIMING_RELATIONSHIP_TOOLS;
    case "interactionOverview":
      return INTERACTION_OVERVIEW_RELATIONSHIP_TOOLS;
    default:
      return assertNever(diagramKind);
  }
}
