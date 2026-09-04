import { useRef, useState } from "react";
import { ClassCanvas } from "../canvas/class/ClassCanvas.js";
import { useDocumentStore } from "../store/documentStore.js";
import { DiagnosticsList } from "./DiagnosticsList.js";
import { DslEditor } from "./DslEditor.js";
import { RelationshipToolbar } from "./RelationshipToolbar.js";
import { Stencil } from "./Stencil.js";

export function EditorShell() {
  const title = useDocumentStore((state) => state.document.title);
  const dsl = useDocumentStore((state) => state.document.dsl);
  const model = useDocumentStore((state) => state.document.model);
  const dslRevision = useDocumentStore((state) => state.dslRevision);
  const diagnostics = useDocumentStore((state) => state.diagnostics);
  const relationshipTool = useDocumentStore((state) => state.relationshipTool);
  const setTitle = useDocumentStore((state) => state.setTitle);
  const setDsl = useDocumentStore((state) => state.setDsl);
  const setDslEditorFocused = useDocumentStore((state) => state.setDslEditorFocused);
  const setRelationshipTool = useDocumentStore((state) => state.setRelationshipTool);

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
        <span className="shrink-0 rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
          class
        </span>
      </header>

      <div className="flex min-h-0 flex-1">
        <Stencil />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <RelationshipToolbar
            selectedTool={relationshipTool}
            onSelectTool={setRelationshipTool}
            canEditMember={selectedClassElement !== null}
            onEditMember={() => editMemberTriggerRef.current?.click()}
          />
          <div className="min-h-0 flex-1" data-testid="canvas-panel">
            <ClassCanvas
              onSelectedNodeChange={setSelectedNodeId}
              editMemberTriggerRef={editMemberTriggerRef}
              selectedNodeId={selectedNodeId}
            />
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
