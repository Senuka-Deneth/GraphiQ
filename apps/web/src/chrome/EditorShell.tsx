import { assertNever } from "@graphiq/uml-core";
import { useEffect, useRef, useState, type ReactElement, type RefObject } from "react";
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
import { exportDocumentPng, exportDocumentSvg } from "../export/exportDocument.js";
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
  const documentId = useDocumentStore((state) => state.document.id);

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

  return (
    <div className="relative flex h-full min-h-0 flex-col">
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
        <span
          className="shrink-0 rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600"
          data-testid="document-kind-badge"
        >
          {kind}
        </span>
        <button
          type="button"
          className="shrink-0 rounded border border-slate-300 px-2 py-1 text-sm text-slate-700 hover:bg-slate-50"
          data-testid="export-svg"
          onClick={() => exportDocumentSvg(useDocumentStore.getState().document)}
        >
          Export SVG
        </button>
        <button
          type="button"
          className="shrink-0 rounded border border-slate-300 px-2 py-1 text-sm text-slate-700 hover:bg-slate-50"
          data-testid="export-png"
          onClick={() => {
            void exportDocumentPng(useDocumentStore.getState().document);
          }}
        >
          Export PNG
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
        <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="min-h-0 flex-1" data-testid="canvas-panel">
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
        </div>
        <ChromePanel
          open={dslOpen}
          onToggle={() => setDslOpen((open) => !open)}
          panelTestId="dsl-editor-panel"
          toggleTestId="dsl-panel-toggle"
          title="DSL"
          showLabel="Show DSL"
          hideLabel="Hide DSL"
          collapsedButtonLabel="DSL"
          collapsedButtonClassName="absolute right-3 top-3 z-20 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs font-medium text-slate-800 shadow-sm hover:bg-slate-50"
          expandedClassName="w-80 min-w-80 border-l border-slate-300 bg-white"
          collapsedClassName="w-0 min-w-0"
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
      </div>

      <DiagnosticsList
        diagnostics={diagnostics}
        open={diagnosticsOpen}
        onToggle={() => setDiagnosticsOpen((open) => !open)}
      />
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