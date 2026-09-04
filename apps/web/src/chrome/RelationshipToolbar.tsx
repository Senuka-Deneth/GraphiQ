import type {
  ClassRelationshipTool,
  ImplementedDiagramKind,
  ObjectRelationshipTool,
  PackageRelationshipTool,
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
  const tools =
    diagramKind === "object"
      ? OBJECT_RELATIONSHIP_TOOLS
      : diagramKind === "package"
        ? PACKAGE_RELATIONSHIP_TOOLS
        : CLASS_RELATIONSHIP_TOOLS;

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
