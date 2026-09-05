import { assertNever } from "@graphiq/uml-core";
import type {
  ClassStencilDropKind,
  ComponentStencilDropKind,
  DeploymentStencilDropKind,
  ImplementedDiagramKind,
  ObjectStencilDropKind,
  PackageStencilDropKind,
  ProfileStencilDropKind,
  UseCaseStencilDropKind,
  CompositeStructureStencilDropKind,
  CommunicationStencilDropKind,
  ActivityStencilDropKind,
  StateMachineStencilDropKind,
  SequenceStencilDropKind,
  TimingStencilDropKind,
  InteractionOverviewStencilDropKind,
  StencilDropKind,
  RelationshipTool,
} from "../store/documentStore.js";
import { ConnectorToolIcon, StencilShapeIcon } from "./stencilIcons.js";
import { relationshipToolsForKind } from "./relationshipTools.js";

export type StencilItem = {
  id: StencilDropKind;
  label: string;
};

export const CLASS_STENCIL_ITEMS: readonly StencilItem[] = [
  { id: "class", label: "Class" },
  { id: "interface", label: "Interface" },
  { id: "enumeration", label: "Enumeration" },
  { id: "abstract-class", label: "Abstract class" },
  { id: "note", label: "Note" },
] as const;

export const OBJECT_STENCIL_ITEMS: readonly StencilItem[] = [
  { id: "instance", label: "Instance" },
  { id: "note", label: "Note" },
] as const;

export const PACKAGE_STENCIL_ITEMS: readonly StencilItem[] = [
  { id: "package", label: "Package" },
  { id: "class", label: "Class" },
  { id: "interface", label: "Interface" },
  { id: "enumeration", label: "Enumeration" },
  { id: "note", label: "Note" },
] as const;

export const COMPONENT_STENCIL_ITEMS: readonly StencilItem[] = [
  { id: "component", label: "Component" },
  { id: "interface", label: "Interface" },
  { id: "port", label: "Port" },
  { id: "artifact", label: "Artifact" },
  { id: "note", label: "Note" },
] as const;

export const DEPLOYMENT_STENCIL_ITEMS: readonly StencilItem[] = [
  { id: "node", label: "Node" },
  { id: "device", label: "Device" },
  { id: "executionEnvironment", label: "Execution environment" },
  { id: "artifact", label: "Artifact" },
  { id: "note", label: "Note" },
] as const;

export const PROFILE_STENCIL_ITEMS: readonly StencilItem[] = [
  { id: "stereotype", label: "Stereotype" },
  { id: "metaclass", label: "Metaclass" },
  { id: "enumeration", label: "Enumeration" },
  { id: "profile", label: "Profile" },
  { id: "note", label: "Note" },
] as const;

export const USE_CASE_STENCIL_ITEMS: readonly StencilItem[] = [
  { id: "actor", label: "Actor" },
  { id: "useCase", label: "Use case" },
  { id: "subject", label: "Subject" },
  { id: "note", label: "Note" },
] as const;

export const COMPOSITE_STRUCTURE_STENCIL_ITEMS: readonly StencilItem[] = [
  { id: "class", label: "Class" },
  { id: "part", label: "Part" },
  { id: "port", label: "Port" },
  { id: "note", label: "Note" },
] as const;

export const COMMUNICATION_STENCIL_ITEMS: readonly StencilItem[] = [
  { id: "instance", label: "Instance" },
  { id: "note", label: "Note" },
] as const;

export const ACTIVITY_STENCIL_ITEMS: readonly StencilItem[] = [
  { id: "action", label: "Action" },
  { id: "objectNode", label: "Object node" },
  { id: "initialNode", label: "Initial" },
  { id: "activityFinalNode", label: "Activity final" },
  { id: "flowFinalNode", label: "Flow final" },
  { id: "decisionNode", label: "Decision" },
  { id: "mergeNode", label: "Merge" },
  { id: "forkNode", label: "Fork" },
  { id: "joinNode", label: "Join" },
  { id: "activityPartition", label: "Partition" },
  { id: "note", label: "Note" },
] as const;

export const STATE_MACHINE_STENCIL_ITEMS: readonly StencilItem[] = [
  { id: "state", label: "State" },
  { id: "initial", label: "Initial" },
  { id: "final", label: "Final" },
  { id: "choice", label: "Choice" },
  { id: "fork", label: "Fork" },
  { id: "join", label: "Join" },
  { id: "note", label: "Note" },
] as const;

export const SEQUENCE_STENCIL_ITEMS: readonly StencilItem[] = [
  { id: "lifeline", label: "Lifeline" },
  { id: "combined-fragment", label: "Combined fragment" },
  { id: "note", label: "Note" },
] as const;

export const TIMING_STENCIL_ITEMS: readonly StencilItem[] = [
  { id: "lifeline", label: "Lifeline" },
  { id: "note", label: "Note" },
] as const;

export const INTERACTION_OVERVIEW_STENCIL_ITEMS: readonly StencilItem[] = [
  { id: "interactionUse", label: "Interaction use" },
  { id: "initialNode", label: "Initial" },
  { id: "activityFinalNode", label: "Final" },
  { id: "decisionNode", label: "Decision" },
  { id: "mergeNode", label: "Merge" },
  { id: "forkNode", label: "Fork" },
  { id: "joinNode", label: "Join" },
  { id: "note", label: "Note" },
] as const;

export const TEXT_STENCIL_ITEM: StencilItem = { id: "text", label: "Text" };

export function stencilItemsForKind(kind: ImplementedDiagramKind): readonly StencilItem[] {
  const items = (() => {
    switch (kind) {
      case "class":
        return CLASS_STENCIL_ITEMS;
      case "object":
        return OBJECT_STENCIL_ITEMS;
      case "package":
        return PACKAGE_STENCIL_ITEMS;
      case "component":
        return COMPONENT_STENCIL_ITEMS;
      case "deployment":
        return DEPLOYMENT_STENCIL_ITEMS;
      case "profile":
        return PROFILE_STENCIL_ITEMS;
      case "useCase":
        return USE_CASE_STENCIL_ITEMS;
      case "compositeStructure":
        return COMPOSITE_STRUCTURE_STENCIL_ITEMS;
      case "communication":
        return COMMUNICATION_STENCIL_ITEMS;
      case "activity":
        return ACTIVITY_STENCIL_ITEMS;
      case "stateMachine":
        return STATE_MACHINE_STENCIL_ITEMS;
      case "sequence":
        return SEQUENCE_STENCIL_ITEMS;
      case "timing":
        return TIMING_STENCIL_ITEMS;
      case "interactionOverview":
        return INTERACTION_OVERVIEW_STENCIL_ITEMS;
      default:
        return assertNever(kind);
    }
  })();

  return [...items, TEXT_STENCIL_ITEM];
}

export type {
  ClassStencilDropKind,
  ComponentStencilDropKind,
  CompositeStructureStencilDropKind,
  CommunicationStencilDropKind,
  ActivityStencilDropKind,
  StateMachineStencilDropKind,
  SequenceStencilDropKind,
  TimingStencilDropKind,
  InteractionOverviewStencilDropKind,
  DeploymentStencilDropKind,
  ObjectStencilDropKind,
  PackageStencilDropKind,
  ProfileStencilDropKind,
  UseCaseStencilDropKind,
  StencilDropKind,
};

type StencilProps = {
  kind: ImplementedDiagramKind;
  implementedKinds: readonly ImplementedDiagramKind[];
  relationshipTool: RelationshipTool;
  onSelectTool: (tool: RelationshipTool) => void;
  onCreateDocument: (kind: ImplementedDiagramKind) => void;
  open: boolean;
  onToggle: () => void;
  canEditMember?: boolean;
  onEditMember?: () => void;
};

export function Stencil({
  kind,
  implementedKinds,
  relationshipTool,
  onSelectTool,
  onCreateDocument,
  open,
  onToggle,
  canEditMember = false,
  onEditMember,
}: StencilProps) {
  const items = stencilItemsForKind(kind);
  const tools = relationshipToolsForKind(kind);

  return (
    <>
      {!open ? (
        <button
          type="button"
          data-testid="stencil-toggle"
          aria-expanded={false}
          aria-label="Show stencil"
          onClick={onToggle}
          className="absolute left-3 top-3 z-20 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs font-medium text-slate-800 shadow-sm hover:bg-slate-50"
        >
          Stencil
        </button>
      ) : null}
      <aside
        className={`graphiq-chrome-transition flex shrink-0 flex-col overflow-hidden border-r border-slate-300 bg-white ${
          open ? "w-56 min-w-56" : "pointer-events-none w-0 min-w-0 border-r-0"
        }`}
        data-testid="stencil"
        aria-label="Element stencil"
        aria-hidden={!open}
      >
        <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-2 py-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Diagram
          </span>
          <button
            type="button"
            data-testid={open ? "stencil-toggle" : undefined}
            aria-expanded={open}
            aria-label="Hide stencil"
            onClick={onToggle}
            className="rounded px-1.5 py-0.5 text-xs text-slate-600 hover:bg-slate-100"
          >
            Hide
          </button>
        </div>
        <label className="flex flex-col gap-1 border-b border-slate-200 px-2 py-2 text-xs text-slate-600">
          <span>Kind</span>
          <select
            value={kind}
            onChange={(event) =>
              onCreateDocument(event.target.value as ImplementedDiagramKind)
            }
            className="rounded border border-slate-300 px-2 py-1 text-sm text-slate-900"
            aria-label="Create diagram kind"
            data-testid="new-document-kind"
          >
            {implementedKinds.map((diagramKind) => (
              <option key={diagramKind} value={diagramKind}>
                {diagramKind}
              </option>
            ))}
          </select>
        </label>
        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Shapes
          </div>
          <ul className="mb-3 grid grid-cols-2 gap-1">
            {items.map((item) => (
              <li key={item.id}>
                <div
                  draggable
                  onDragStart={(event) => {
                    event.dataTransfer.setData("application/graphiq-stencil", item.id);
                    event.dataTransfer.effectAllowed = "move";
                  }}
                  className="flex cursor-grab flex-col items-center gap-0.5 rounded border border-slate-200 bg-slate-50 px-1 py-1.5 text-center text-[11px] leading-tight text-slate-800 active:cursor-grabbing"
                  data-stencil-item={item.id}
                >
                  <StencilShapeIcon id={item.id} />
                  {item.label}
                </div>
              </li>
            ))}
          </ul>
          <div
            className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500"
            data-testid="relationship-toolbar"
          >
            Connectors
          </div>
          <ul className="grid grid-cols-2 gap-1">
            {tools.map((tool) => (
              <li key={tool.id}>
                <button
                  type="button"
                  data-relationship-tool={tool.id}
                  aria-pressed={relationshipTool === tool.id}
                  onClick={() => onSelectTool(tool.id)}
                  className={`flex w-full flex-col items-center gap-0.5 rounded border px-1 py-1.5 text-center text-[11px] leading-tight ${
                    relationshipTool === tool.id
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-slate-50 text-slate-800 hover:bg-slate-100"
                  }`}
                >
                  <ConnectorToolIcon id={tool.id} />
                  {tool.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
        {onEditMember ? (
          <div className="border-t border-slate-200 p-2">
            <button
              type="button"
              data-testid="edit-member-button"
              disabled={!canEditMember}
              onClick={onEditMember}
              className="w-full rounded px-2 py-1 text-xs bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Edit member
            </button>
          </div>
        ) : null}
      </aside>
    </>
  );
}
