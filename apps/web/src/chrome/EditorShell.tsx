import { useRef, useState } from "react";
import { ClassCanvas } from "../canvas/class/ClassCanvas.js";
import { ObjectCanvas } from "../canvas/object/ObjectCanvas.js";
import { PackageCanvas } from "../canvas/package/PackageCanvas.js";
import {
  useDocumentStore,
  type ImplementedDiagramKind,
} from "../store/documentStore.js";
import { DiagnosticsList } from "./DiagnosticsList.js";
import { DslEditor } from "./DslEditor.js";
import { RelationshipToolbar } from "./RelationshipToolbar.js";
import { Stencil } from "./Stencil.js";

const IMPLEMENTED_KINDS: readonly ImplementedDiagramKind[] = ["class", "object", "package"];

export function EditorShell() {
  const title = useDocumentStore((state) => state.document.title);
  const kind = useDocumentStore((state) => state.document.kind);
  const dsl = useDocumentStore((state) => state.document.dsl);
  const model = useDocumentStore((state) => state.document.model);
  const dslRevision = useDocumentStore((state) => state.dslRevision);
  const diagnostics = useDocumentStore((state) => state.diagnostics);
  const relationshipTool = useDocumentStore((state) => state.relationshipTool);
  const setTitle = useDocumentStore((state) => state.setTitle);
  const setDsl = useDocumentStore((state) => state.setDsl);
  const setDslEditorFocused = useDocumentStore((state) => state.setDslEditorFocused);
  const setRelationshipTool = useDocumentStore((state) => state.setRelationshipTool);
  const createDocument = useDocumentStore((state) => state.createDocument);

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const editMemberTriggerRef = useRef<HTMLButtonElement>(null);

  const selectedClassElement =
    selectedNodeId === null
      ? null
      : model.elements.find(
          (element) => element.id === selectedNodeId && element.elementType === "class",
        );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex shrink-0 items-center gap-4 border-b border-slate-300 bg-white px-4 py-2">
        <h1 className="text-lg font-semibold tracking-tight text-slate-900">GraphiQ</h1>
        <label className="flex min-w-0 flex-1 items-center gap-2 text-sm text-slate-600">
          <span className="shrink-0">Title</span>
          <input
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="min-w-0 flex-1 rounded border border-slate-300 px-2 py-1 text-slate-900"
            aria-label="Diagram title"
          />
        </label>
        <label className="flex shrink-0 items-center gap-2 text-sm text-slate-600">
          <span className="shrink-0">New</span>
          <select
            value={kind}
            onChange={(event) =>
              createDocument(event.target.value as ImplementedDiagramKind)
            }
            className="rounded border border-slate-300 px-2 py-1 text-slate-900"
            aria-label="Create diagram kind"
            data-testid="new-document-kind"
          >
            {IMPLEMENTED_KINDS.map((diagramKind) => (
              <option key={diagramKind} value={diagramKind}>
                {diagramKind}
              </option>
            ))}
          </select>
        </label>
        <span
          className="shrink-0 rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600"
          data-testid="document-kind-badge"
        >
          {kind}
        </span>
      </header>

      <div className="flex min-h-0 flex-1">
        <Stencil kind={kind} />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <RelationshipToolbar
            diagramKind={kind}
            selectedTool={relationshipTool}
            onSelectTool={setRelationshipTool}
            canEditMember={kind === "class" && selectedClassElement !== null}
            onEditMember={
              kind === "class" ? () => editMemberTriggerRef.current?.click() : undefined
            }
          />
          <div className="min-h-0 flex-1" data-testid="canvas-panel">
            {kind === "object" ? (
              <ObjectCanvas onSelectedNodeChange={setSelectedNodeId} />
            ) : kind === "package" ? (
              <PackageCanvas onSelectedNodeChange={setSelectedNodeId} />
            ) : (
              <ClassCanvas
                onSelectedNodeChange={setSelectedNodeId}
                editMemberTriggerRef={editMemberTriggerRef}
                selectedNodeId={selectedNodeId}
              />
            )}
          </div>
        </div>
        <div className="flex w-80 shrink-0 flex-col border-l border-slate-300">
          <div className="border-b border-slate-200 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
            DSL
          </div>
          <DslEditor
            value={dsl}
            revision={dslRevision}
            diagnostics={diagnostics}
            onChange={setDsl}
            onFocus={() => setDslEditorFocused(true)}
            onBlur={() => setDslEditorFocused(false)}
          />
        </div>
      </div>

      <DiagnosticsList diagnostics={diagnostics} />
    </div>
  );
}
