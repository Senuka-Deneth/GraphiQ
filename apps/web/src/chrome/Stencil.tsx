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
  StencilDropKind,
} from "../store/documentStore.js";

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

export function stencilItemsForKind(kind: ImplementedDiagramKind): readonly StencilItem[] {
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
    default:
      return assertNever(kind);
  }
}

export type {
  ClassStencilDropKind,
  ComponentStencilDropKind,
  CompositeStructureStencilDropKind,
  CommunicationStencilDropKind,
  ActivityStencilDropKind,
  StateMachineStencilDropKind,
  DeploymentStencilDropKind,
  ObjectStencilDropKind,
  PackageStencilDropKind,
  ProfileStencilDropKind,
  UseCaseStencilDropKind,
  StencilDropKind,
};

type StencilProps = {
  kind: ImplementedDiagramKind;
};

export function Stencil({ kind }: StencilProps) {
  const items = stencilItemsForKind(kind);

  return (
    <aside
      className="flex w-44 shrink-0 flex-col border-r border-slate-300 bg-white"
      data-testid="stencil"
      aria-label="Element stencil"
    >
      <div className="border-b border-slate-200 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        Stencil
      </div>
      <ul className="flex flex-col gap-1 p-2">
        {items.map((item) => (
          <li key={item.id}>
            <div
              draggable
              onDragStart={(event) => {
                event.dataTransfer.setData("application/graphiq-stencil", item.id);
                event.dataTransfer.effectAllowed = "move";
              }}
              className="cursor-grab rounded border border-slate-200 bg-slate-50 px-2 py-1.5 text-sm text-slate-800 active:cursor-grabbing"
              data-stencil-item={item.id}
            >
              {item.label}
            </div>
          </li>
        ))}
      </ul>
    </aside>
  );
}
