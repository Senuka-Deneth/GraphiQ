import { assertNever } from "@graphiq/uml-core";
import { useEffect, useRef, useState, type ChangeEvent, type ReactElement, type RefObject } from "react";
import { ClassCanvas } from "../canvas/class/ClassCanvas.js";
import { ComponentCanvas } from "../canvas/component/ComponentCanvas.js";
import { DeploymentCanvas } from "../canvas/deployment/DeploymentCanvas.js";
import { ObjectCanvas } from "../canvas/object/ObjectCanvas.js";
import { PackageCanvas } from "../canvas/package/PackageCanvas.js";
import { ProfileCanvas } from "../canvas/profile/ProfileCanvas.js";
import { CommunicationCanvas } from "../canvas/communication/CommunicationCanvas.js";
import { ActivityCanvas } from "../canvas/activity/ActivityCanvas.js";
import { StateMachineCanvas } from "../canvas/stateMachine/StateMachineCanvas.js";
import { SequenceCanvas } from "../canvas/sequence/SequenceCanvas.js";
import { TimingCanvas } from "../canvas/timing/TimingCanvas.js";
import { InteractionOverviewCanvas } from "../canvas/interactionOverview/InteractionOverviewCanvas.js";
import { CompositeStructureCanvas } from "../canvas/compositeStructure/CompositeStructureCanvas.js";
import { UseCaseCanvas } from "../canvas/useCase/UseCaseCanvas.js";
import {
  useDocumentStore,
  type ImplementedDiagramKind,
} from "../store/documentStore.js";
import { ChromePanel } from "./ChromePanel.js";
import { DiagnosticsList } from "./DiagnosticsList.js";
import { DslEditor } from "./DslEditor.js";
import { EdgeStyleToolbar } from "./EdgeStyleToolbar.js";
import { downloadDslGuide } from "../dsl-guide/downloadDslGuide.js";
import { exportDocumentPng, exportDocumentSvg } from "../export/exportDocument.js";
import {
  DiagnosticsIcon,
  DownloadIcon,
  DslIcon,
  ExportIcon,
  ImportIcon,
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
  const importDsl = useDocumentStore((state) => state.importDsl);
  const documentId = useDocumentStore((state) => state.document.id);

  const importInputRef = useRef<HTMLInputElement>(null);

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

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="graphiq-topbar flex shrink-0 items-center gap-3 px-3">
        <h1 className="shrink-0 text-lg font-semibold tracking-tight">GraphiQ</h1>
        <input
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className="graphiq-field h-7 min-w-0 flex-1 px-2 text-[13px]"
          aria-label="Diagram title"
        />
        <span
          className="graphiq-section-label shrink-0"
          data-testid="document-kind-badge"
        >
          {kind}
        </span>
        <button
          type="button"
          className="graphiq-control h-7 shrink-0 px-2"
          data-testid="download-dsl-guide"
          onClick={() => downloadDslGuide()}
        >
          <DownloadIcon />
          DSL guide
        </button>
        <button
          type="button"
          className="graphiq-control h-7 shrink-0 px-2"
          data-testid="import-dsl"
          onClick={handleImportDslClick}
        >
          <ImportIcon />
          Import DSL
        </button>
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
        <button
          type="button"
          className="graphiq-control h-7 shrink-0 px-2"
          data-testid="export-svg"
          onClick={() => exportDocumentSvg(useDocumentStore.getState().document)}
        >
          <ExportIcon />
          SVG
        </button>
        <button
          type="button"
          className="graphiq-control h-7 shrink-0 px-2"
          data-testid="export-png"
          onClick={() => {
            void exportDocumentPng(useDocumentStore.getState().document);
          }}
        >
          <ExportIcon />
          PNG
        </button>
      </header>

      <div className="relative flex min-h-0 flex-1">
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
        />
        <div className="relative min-h-0 min-w-0 flex-1">
          <div className="h-full min-h-0" data-testid="canvas-panel">
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
    </div>
  );
}

type KindCanvasProps = {
  kind: ImplementedDiagramKind;
  onSelectedNodeChange: (nodeId: string | null) => void;
  onSelectedEdgeChange: (edgeId: string | null) => void;
  editMemberTriggerRef: RefObject<HTMLButtonElement | null>;
  selectedNodeId: string | null;
};

function KindCanvas({
  kind,
  onSelectedNodeChange,
  onSelectedEdgeChange,
  editMemberTriggerRef,
  selectedNodeId,
}: KindCanvasProps): ReactElement {
  switch (kind) {
    case "class":
      return (
        <ClassCanvas
          onSelectedNodeChange={onSelectedNodeChange}
          onSelectedEdgeChange={onSelectedEdgeChange}
          editMemberTriggerRef={editMemberTriggerRef}
          selectedNodeId={selectedNodeId}
        />
      );
    case "object":
      return (
        <ObjectCanvas
          onSelectedNodeChange={onSelectedNodeChange}
          onSelectedEdgeChange={onSelectedEdgeChange}
        />
      );
    case "package":
      return (
        <PackageCanvas
          onSelectedNodeChange={onSelectedNodeChange}
          onSelectedEdgeChange={onSelectedEdgeChange}
        />
      );
    case "component":
      return (
        <ComponentCanvas
          onSelectedNodeChange={onSelectedNodeChange}
          onSelectedEdgeChange={onSelectedEdgeChange}
        />
      );
    case "deployment":
      return (
        <DeploymentCanvas
          onSelectedNodeChange={onSelectedNodeChange}
          onSelectedEdgeChange={onSelectedEdgeChange}
        />
      );
    case "profile":
      return (
        <ProfileCanvas
          onSelectedNodeChange={onSelectedNodeChange}
          onSelectedEdgeChange={onSelectedEdgeChange}
        />
      );
    case "useCase":
      return (
        <UseCaseCanvas
          onSelectedNodeChange={onSelectedNodeChange}
          onSelectedEdgeChange={onSelectedEdgeChange}
        />
      );
    case "compositeStructure":
      return (
        <CompositeStructureCanvas
          onSelectedNodeChange={onSelectedNodeChange}
          onSelectedEdgeChange={onSelectedEdgeChange}
        />
      );
    case "communication":
      return (
        <CommunicationCanvas
          onSelectedNodeChange={onSelectedNodeChange}
          onSelectedEdgeChange={onSelectedEdgeChange}
        />
      );
    case "activity":
      return (
        <ActivityCanvas
          onSelectedNodeChange={onSelectedNodeChange}
          onSelectedEdgeChange={onSelectedEdgeChange}
        />
      );
    case "stateMachine":
      return (
        <StateMachineCanvas
          onSelectedNodeChange={onSelectedNodeChange}
          onSelectedEdgeChange={onSelectedEdgeChange}
        />
      );
    case "sequence":
      return (
        <SequenceCanvas
          onSelectedNodeChange={onSelectedNodeChange}
          onSelectedEdgeChange={onSelectedEdgeChange}
        />
      );
    case "timing":
      return (
        <TimingCanvas
          onSelectedNodeChange={onSelectedNodeChange}
          onSelectedEdgeChange={onSelectedEdgeChange}
        />
      );
    case "interactionOverview":
      return (
        <InteractionOverviewCanvas
          onSelectedNodeChange={onSelectedNodeChange}
          onSelectedEdgeChange={onSelectedEdgeChange}
        />
      );
    default:
      return assertNever(kind);
  }
}