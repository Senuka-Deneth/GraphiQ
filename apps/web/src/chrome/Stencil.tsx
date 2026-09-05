import { assertNever } from "@graphiq/uml-core";
import { useRef, useState, type PointerEvent } from "react";
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
import {
  DownloadIcon,
  ExportIcon,
  ImportIcon,
  SidebarToggleIcon,
} from "./icons.js";
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
  title: string;
  onTitleChange: (title: string) => void;
  onDownloadGuide: () => void;
  onImportClick: () => void;
  onOpenExport?: () => void;
};

const MIN_SIDEBAR_WIDTH = 216;
const MAX_SIDEBAR_WIDTH = 320;
const DEFAULT_SIDEBAR_WIDTH = 240;

function clampSidebarWidth(width: number): number {
  return Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, Math.round(width)));
}

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
  title,
  onTitleChange,
  onDownloadGuide,
  onImportClick,
  onOpenExport,
}: StencilProps) {
  const items = stencilItemsForKind(kind);
  const tools = relationshipToolsForKind(kind);

  const [width, setWidth] = useState(DEFAULT_SIDEBAR_WIDTH);
  const dragRef = useRef<{ startX: number; startWidth: number } | null>(null);

  const handleResizePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    dragRef.current = { startX: event.clientX, startWidth: width };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleResizePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (drag === null) {
      return;
    }
    setWidth(clampSidebarWidth(drag.startWidth + event.clientX - drag.startX));
  };

  const handleResizePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (dragRef.current === null) {
      return;
    }
    dragRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  return (
    <>
      {!open ? (
        <button
          type="button"
          data-testid="stencil-toggle"
          aria-expanded={false}
          aria-label="Show stencil"
          onClick={onToggle}
          className="graphiq-island-controls graphiq-icon-button absolute left-3 top-3 z-20"
        >
          <SidebarToggleIcon />
        </button>
      ) : null}
      <aside
        className={`graphiq-chrome-transition relative flex shrink-0 flex-col overflow-hidden ${
          open ? "graphiq-sidebar" : "pointer-events-none w-0 min-w-0"
        }`}
        style={open ? { width, minWidth: width } : undefined}
        data-testid="stencil"
        aria-label="Element stencil"
        aria-hidden={!open}
      >
        <div className="flex shrink-0 items-center justify-between gap-2 px-3 pb-1 pt-3">
          <h1 className="text-[15px] font-semibold tracking-tight">GraphiQ</h1>
          <button
            type="button"
            data-testid={open ? "stencil-toggle" : undefined}
            aria-expanded={open}
            aria-label="Hide stencil"
            onClick={onToggle}
            className="graphiq-icon-button"
          >
            <SidebarToggleIcon />
          </button>
        </div>
        <div className="shrink-0 px-3 pb-3">
          <input
            type="text"
            value={title}
            onChange={(event) => onTitleChange(event.target.value)}
            className="graphiq-title-pill"
            aria-label="Diagram title"
            placeholder="GraphiQ"
          />
        </div>
        <div className="flex shrink-0 items-center gap-2 px-3 pb-3">
          <select
            value={kind}
            onChange={(event) =>
              onCreateDocument(event.target.value as ImplementedDiagramKind)
            }
            className="graphiq-field h-9 min-w-0 flex-1 px-2 text-[15px]"
            aria-label="Create diagram kind"
            data-testid="new-document-kind"
          >
            {implementedKinds.map((diagramKind) => (
              <option key={diagramKind} value={diagramKind}>
                {diagramKind}
              </option>
            ))}
          </select>
          <span className="graphiq-section-label shrink-0" data-testid="document-kind-badge">
            {kind}
          </span>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-2">
          <div className="graphiq-section-label flex h-7 items-center">Shapes</div>
          <ul className="mb-3 grid grid-cols-3 gap-1">
            {items.map((item) => (
              <li key={item.id}>
                <div
                  draggable
                  onDragStart={(event) => {
                    event.dataTransfer.setData("application/graphiq-stencil", item.id);
                    event.dataTransfer.effectAllowed = "move";
                  }}
                  className="graphiq-icon-tile cursor-grab active:cursor-grabbing"
                  data-stencil-item={item.id}
                  aria-label={item.label}
                  title={item.label}
                >
                  <StencilShapeIcon id={item.id} />
                </div>
              </li>
            ))}
          </ul>
          <div
            className="graphiq-section-label flex h-7 items-center"
            data-testid="relationship-toolbar"
          >
            Connectors
          </div>
          <ul className="grid grid-cols-3 gap-1">
            {tools.map((tool) => (
              <li key={tool.id}>
                <button
                  type="button"
                  data-relationship-tool={tool.id}
                  aria-label={tool.label}
                  title={tool.label}
                  aria-pressed={relationshipTool === tool.id}
                  onClick={() => onSelectTool(tool.id)}
                  className="graphiq-icon-tile"
                >
                  <ConnectorToolIcon id={tool.id} />
                </button>
              </li>
            ))}
          </ul>
        </div>
        {onEditMember ? (
          <div
            className="shrink-0 px-3 pb-2 pt-1"
            style={{ borderTop: "1px solid var(--graphiq-hairline)" }}
          >
            <button
              type="button"
              data-testid="edit-member-button"
              disabled={!canEditMember}
              onClick={onEditMember}
              className="graphiq-control h-9 w-full text-[15px] disabled:cursor-not-allowed"
            >
              Edit member
            </button>
          </div>
        ) : null}
        <div
          className="grid shrink-0 grid-cols-3 gap-1 px-3 py-3"
          style={{ borderTop: "1px solid var(--graphiq-hairline)" }}
        >
          <button
            type="button"
            className="graphiq-icon-tile"
            data-testid="open-export"
            aria-label="Export diagram"
            title="Export"
            disabled={onOpenExport === undefined}
            onClick={onOpenExport}
          >
            <DownloadIcon />
          </button>
          <button
            type="button"
            className="graphiq-icon-tile"
            data-testid="import-dsl"
            aria-label="Import DSL"
            title="Import DSL"
            onClick={onImportClick}
          >
            <ImportIcon />
          </button>
          <button
            type="button"
            className="graphiq-icon-tile"
            data-testid="download-dsl-guide"
            aria-label="Download DSL guide"
            title="DSL guide"
            onClick={onDownloadGuide}
          >
            <ExportIcon />
          </button>
        </div>
        {open ? (
          <div
            role="separator"
            aria-label="Resize sidebar"
            aria-orientation="vertical"
            onPointerDown={handleResizePointerDown}
            onPointerMove={handleResizePointerMove}
            onPointerUp={handleResizePointerUp}
            onPointerCancel={handleResizePointerUp}
            className="absolute right-0 top-0 z-10 h-full w-1.5 cursor-col-resize"
          />
        ) : null}
      </aside>
    </>
  );
}
