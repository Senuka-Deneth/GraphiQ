import { assertNever } from "@graphiq/uml-core";
import type {
  ClassRelationshipTool,
  ComponentRelationshipTool,
  DeploymentRelationshipTool,
  ImplementedDiagramKind,
  ObjectRelationshipTool,
  PackageRelationshipTool,
  ProfileRelationshipTool,
  UseCaseRelationshipTool,
  CompositeStructureRelationshipTool,
  CommunicationRelationshipTool,
  ActivityRelationshipTool,
  StateMachineRelationshipTool,
  SequenceRelationshipTool,
  RelationshipTool,
} from "../store/documentStore.js";

const CLASS_RELATIONSHIP_TOOLS: readonly { id: ClassRelationshipTool; label: string }[] = [
  { id: "association", label: "Association" },
  { id: "aggregation", label: "Aggregation" },
  { id: "composition", label: "Composition" },
  { id: "generalization", label: "Generalization" },
  { id: "realization", label: "Realization" },
  { id: "dependency", label: "Dependency" },
] as const;

const OBJECT_RELATIONSHIP_TOOLS: readonly { id: ObjectRelationshipTool; label: string }[] = [
  { id: "link", label: "Link" },
  { id: "dependency", label: "Dependency" },
] as const;

const PACKAGE_RELATIONSHIP_TOOLS: readonly { id: PackageRelationshipTool; label: string }[] = [
  { id: "packageImport", label: "Import" },
  { id: "packageMerge", label: "Merge" },
  { id: "dependency", label: "Dependency" },
] as const;

const COMPONENT_RELATIONSHIP_TOOLS: readonly { id: ComponentRelationshipTool; label: string }[] = [
  { id: "interfaceRealization", label: "Provided" },
  { id: "usage", label: "Required" },
  { id: "assemblyConnector", label: "Assembly" },
  { id: "delegationConnector", label: "Delegation" },
  { id: "dependency", label: "Dependency" },
] as const;

const DEPLOYMENT_RELATIONSHIP_TOOLS: readonly { id: DeploymentRelationshipTool; label: string }[] = [
  { id: "communicationPath", label: "Communication path" },
  { id: "deployment", label: "Deploy" },
  { id: "generalization", label: "Generalization" },
] as const;

const PROFILE_RELATIONSHIP_TOOLS: readonly { id: ProfileRelationshipTool; label: string }[] = [
  { id: "extension", label: "Extension" },
  { id: "generalization", label: "Generalization" },
] as const;

const USE_CASE_RELATIONSHIP_TOOLS: readonly { id: UseCaseRelationshipTool; label: string }[] = [
  { id: "association", label: "Association" },
  { id: "include", label: "Include" },
  { id: "extend", label: "Extend" },
  { id: "generalization", label: "Generalization" },
] as const;

const COMPOSITE_STRUCTURE_RELATIONSHIP_TOOLS: readonly {
  id: CompositeStructureRelationshipTool;
  label: string;
}[] = [
  { id: "connector", label: "Connector" },
  { id: "assemblyConnector", label: "Assembly" },
  { id: "dependency", label: "Dependency" },
] as const;

const COMMUNICATION_RELATIONSHIP_TOOLS: readonly {
  id: CommunicationRelationshipTool;
  label: string;
}[] = [
  { id: "message", label: "Message" },
  { id: "link", label: "Link" },
] as const;

const ACTIVITY_RELATIONSHIP_TOOLS: readonly {
  id: ActivityRelationshipTool;
  label: string;
}[] = [
  { id: "controlFlow", label: "Control flow" },
  { id: "objectFlow", label: "Object flow" },
] as const;

const STATE_MACHINE_RELATIONSHIP_TOOLS: readonly {
  id: StateMachineRelationshipTool;
  label: string;
}[] = [{ id: "transition", label: "Transition" }] as const;

const SEQUENCE_RELATIONSHIP_TOOLS: readonly {
  id: SequenceRelationshipTool;
  label: string;
}[] = [
  { id: "synchCall", label: "Sync call" },
  { id: "asynchCall", label: "Async call" },
  { id: "reply", label: "Reply" },
  { id: "createMessage", label: "Create" },
] as const;

function toolsForKind(diagramKind: ImplementedDiagramKind) {
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
    default:
      return assertNever(diagramKind);
  }
}

type RelationshipToolbarProps = {
  diagramKind: ImplementedDiagramKind;
  selectedTool: RelationshipTool;
  onSelectTool: (tool: RelationshipTool) => void;
  onEditMember?: () => void;
  canEditMember?: boolean;
};

export function RelationshipToolbar({
  diagramKind,
  selectedTool,
  onSelectTool,
  onEditMember,
  canEditMember = false,
}: RelationshipToolbarProps) {
  const tools = toolsForKind(diagramKind);

  return (
    <div
      className="flex flex-wrap items-center gap-1 border-b border-slate-200 bg-white px-2 py-1.5"
      data-testid="relationship-toolbar"
    >
      <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
        Connect
      </span>
      {tools.map((tool) => (
        <button
          key={tool.id}
          type="button"
          data-relationship-tool={tool.id}
          aria-pressed={selectedTool === tool.id}
          onClick={() => onSelectTool(tool.id)}
          className={`rounded px-2 py-1 text-xs ${
            selectedTool === tool.id
              ? "bg-slate-900 text-white"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          {tool.label}
        </button>
      ))}
      {onEditMember ? (
        <button
          type="button"
          data-testid="edit-member-button"
          disabled={!canEditMember}
          onClick={onEditMember}
          className="ml-auto rounded px-2 py-1 text-xs bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Edit member
        </button>
      ) : null}
    </div>
  );
}
