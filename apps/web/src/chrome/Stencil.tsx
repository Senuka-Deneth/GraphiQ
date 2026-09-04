import type { StencilDropKind } from "../store/documentStore.js";

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

type StencilProps = {
  items?: readonly StencilItem[];
};

export function Stencil({ items = CLASS_STENCIL_ITEMS }: StencilProps) {
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
