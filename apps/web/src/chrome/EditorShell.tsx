import { useEffect, useRef, useState, type ChangeEvent } from "react";
import {
  useDocumentStore,
  type ImplementedDiagramKind,
} from "../store/documentStore.js";
import { ChromePanel } from "./ChromePanel.js";
import { DiagnosticsList } from "./DiagnosticsList.js";
import { DslEditor } from "./DslEditor.js";
import { EdgeStyleToolbar } from "./EdgeStyleToolbar.js";
import { confirmAndDownloadDslGuide } from "../dsl-guide/downloadDslGuide.js";
import type { ExportEntryState } from "../export/exportSettings.js";
import { KindCanvas } from "../canvas/KindCanvas.js";
import {
  DiagnosticsIcon,
  DslIcon,
} from "./icons.js";
import { Stencil } from "./Stencil.js";

const IMPLEMENTED_KINDS: readonly ImplementedDiagramKind[] = [
  "class",
  "object",
  "package",
  "component",
  "deployment",
  "profile",
  "useCase",
  "compositeStructure",
  "communication",
  "activity",
  "stateMachine",
  "sequence",
  "timing",
  "interactionOverview",
];

export function EditorShell({
  onOpenExport,
}: {
  onOpenExport?: (entry: ExportEntryState) => void;
} = {}) {
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
  const importDsl = useDocumentStore((state) => state.importDsl);
  const documentId = useDocumentStore((state) => state.document.id);

  const importInputRef = useRef<HTMLInputElement>(null);
  const canvasPanelRef = useRef<HTMLDivElement>(null);

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [dslOpen, setDslOpen] = useState(false);
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false);
  const hadErrorRef = useRef(false);
  const editMemberTriggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const hasError = diagnostics.some((diagnostic) => diagnostic.severity === "error");
    if (hasError && !hadErrorRef.current) {
      setDiagnosticsOpen(true);
    }
    hadErrorRef.current = hasError;
  }, [diagnostics]);

  const selectedClassElement =
    selectedNodeId === null
      ? null
      : model.elements.find(
          (element) => element.id === selectedNodeId && element.elementType === "class",
        );

  const handleImportDslClick = () => {
    importInputRef.current?.click();
  };

  const handleImportDslFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file === undefined) {
      return;
    }
    const text = await file.text();
    importDsl(text);
  };

  const errorCount = diagnostics.filter(
    (diagnostic) => diagnostic.severity === "error",
  ).length;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Backspace" && event.key !== "Delete") {
        return;
      }
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        target.closest("input, textarea, select, [contenteditable='true']")
      ) {
        return;
      }
      if (
        target instanceof HTMLElement &&
        target.closest(".react-flow, [data-testid='sequence-canvas'], [data-testid='timing-canvas']")
      ) {
        return;
      }
      if (selectedNodeId !== null) {
        event.preventDefault();
        void useDocumentStore.getState().deleteElements([selectedNodeId]);
        setSelectedNodeId(null);
        return;
      }
      if (selectedEdgeId !== null) {
        event.preventDefault();
        void useDocumentStore.getState().deleteRelationships([selectedEdgeId]);
        setSelectedEdgeId(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedEdgeId, selectedNodeId]);

  return (
    <div className="relative flex h-full min-h-0">
      <Stencil
        kind={kind}
        implementedKinds={IMPLEMENTED_KINDS}
        relationshipTool={relationshipTool}
        onSelectTool={setRelationshipTool}
        onCreateDocument={createDocument}
        open={sidebarOpen}
        onToggle={() => setSidebarOpen((open) => !open)}
        canEditMember={kind === "class" && selectedClassElement !== null}
        onEditMember={
          kind === "class" ? () => editMemberTriggerRef.current?.click() : undefined
        }
        title={title}
        onTitleChange={setTitle}
        onDownloadGuide={() => {
          confirmAndDownloadDslGuide();
        }}
        onImportClick={handleImportDslClick}
        onOpenExport={
          onOpenExport === undefined
            ? undefined
            : () => {
                const box = canvasPanelRef.current?.getBoundingClientRect();
                onOpenExport({
                  panelWidth: Math.max(1, box?.width ?? 800),
                  panelHeight: Math.max(1, box?.height ?? 600),
                });
              }
        }
      />
      <input
        ref={importInputRef}
        type="file"
        accept=".md,.dsl,.txt,text/markdown,text/plain"
        className="hidden"
        data-testid="import-dsl-input"
        onChange={(event) => {
          void handleImportDslFile(event);
        }}
      />
      <div className="relative min-h-0 min-w-0 flex-1">
          <div ref={canvasPanelRef} className="h-full min-h-0" data-testid="canvas-panel">
            <KindCanvas
              key={documentId}
              kind={kind}
              onSelectedNodeChange={setSelectedNodeId}
              onSelectedEdgeChange={setSelectedEdgeId}
              editMemberTriggerRef={editMemberTriggerRef}
              selectedNodeId={selectedNodeId}
            />
          </div>

          {selectedEdgeId !== null ? (
            <EdgeStyleToolbar relationshipId={selectedEdgeId} diagramKind={kind} />
          ) : null}

          <div className="graphiq-island-controls absolute right-3 top-3 z-30 flex flex-col">
            <button
              type="button"
              className="graphiq-icon-button"
              data-testid="dsl-panel-toggle"
              aria-expanded={dslOpen}
              aria-pressed={dslOpen}
              aria-label={dslOpen ? "Hide DSL" : "Show DSL"}
              onClick={() => setDslOpen((open) => !open)}
            >
              <DslIcon />
            </button>
            <div className="h-px bg-[var(--graphiq-hairline)]" />
            <button
              type="button"
              className="graphiq-icon-button relative"
              data-testid="diagnostics-toggle"
              aria-expanded={diagnosticsOpen}
              aria-pressed={diagnosticsOpen}
              aria-label={
                diagnosticsOpen
                  ? "Hide diagnostics"
                  : errorCount > 0
                    ? `Show diagnostics, ${errorCount} errors`
                    : "Show diagnostics"
              }
              onClick={() => setDiagnosticsOpen((open) => !open)}
            >
              <DiagnosticsIcon />
              {errorCount > 0 ? (
                <span
                  className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[var(--graphiq-error)]"
                  aria-hidden="true"
                />
              ) : null}
            </button>
          </div>

          <ChromePanel
            open={dslOpen}
            panelTestId="dsl-editor-panel"
            title="DSL"
            openClassName="bottom-3 right-[calc(var(--graphiq-inset)+38px)] top-3 w-90"
          >
            <DslEditor
              value={dsl}
              revision={dslRevision}
              diagnostics={diagnostics}
              onChange={setDsl}
              onFocus={() => setDslEditorFocused(true)}
              onBlur={() => setDslEditorFocused(false)}
            />
          </ChromePanel>

          <DiagnosticsList diagnostics={diagnostics} open={diagnosticsOpen} />
        </div>
    </div>
  );
}

