import { assertNever } from "@graphiq/uml-core";
import type {
  ClassStencilDropKind,
  ComponentStencilDropKind,
  DeploymentStencilDropKind,
  ImplementedDiagramKind,
  ObjectStencilDropKind,
  PackageStencilDropKind,
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
    default:
      return assertNever(kind);
  }
}

export type {
  ClassStencilDropKind,
  ComponentStencilDropKind,
  DeploymentStencilDropKind,
  ObjectStencilDropKind,
  PackageStencilDropKind,
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
