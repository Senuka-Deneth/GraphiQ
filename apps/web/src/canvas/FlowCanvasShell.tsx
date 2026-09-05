import {
  ReactFlow,
  applyEdgeChanges,
  applyNodeChanges,
  useConnection,
  type Edge,
  type Node,
  type NodeChange,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useCallback, useLayoutEffect, useMemo, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { MarkerDefs } from "./class/MarkerDefs.js";
import { extraStrokeColors } from "./class/markerPaint.js";
import { UmlEdge, umlEdgeTypeName, type UmlEdgeData } from "./class/UmlEdge.js";
import { useCanvasMode, usePreviewViewport } from "./canvasMode.js";
import { DEFAULT_VIEWPORT, FLOW_CANVAS_DEFAULTS } from "./canvasDefaults.js";
import { GraphiqFlowBackground } from "./GraphiqFlowBackground.js";
import { wrapNodeTypes } from "./NodeSelectionChrome.js";
import { CanvasControls } from "../chrome/CanvasControls.js";
import { useDocumentStore } from "../store/documentStore.js";
import { useFlowCanvasCallbacks } from "./useFlowCanvasCallbacks.js";

const edgeTypes = {
  [umlEdgeTypeName]: UmlEdge,
} as const;

type FlowCanvasShellProps = {
  testId: string;
  nodes: Node[];
  edges: Edge[];
  nodeTypes: NodeTypes;
  onSelectedNodeChange?: (nodeId: string | null) => void;
  onSelectedEdgeChange?: (edgeId: string | null) => void;
  onNodeDoubleClick?: (event: MouseEvent, node: Node) => void;
  children?: ReactNode;
};

function preserveSelected<T extends { id: string; selected?: boolean }>(
  next: T[],
  previous: T[],
): T[] {
  const selectedIds = new Set(previous.filter((item) => item.selected).map((item) => item.id));
  return next.map((item) => ({
    ...item,
    selected: selectedIds.has(item.id),
  }));
}

function applyNodeDimensionData(nodes: Node[], changes: NodeChange[]): Node[] {
  const sizes = new Map<string, { width: number; height: number }>();
  for (const change of changes) {
    if (change.type !== "dimensions" || change.dimensions === undefined) {
      continue;
    }
    sizes.set(change.id, change.dimensions);
  }
  if (sizes.size === 0) {
    return nodes;
  }
  return nodes.map((node) => {
    const size = sizes.get(node.id);
    if (size === undefined) {
      return node;
    }
    const data = node.data;
    if (typeof data !== "object" || data === null || !("width" in data)) {
      return { ...node, width: size.width, height: size.height };
    }
    return {
      ...node,
      width: size.width,
      height: size.height,
      data: {
        ...data,
        width: size.width,
        height: size.height,
      },
    };
  });
}

function isInteractingChange(changes: NodeChange[]): boolean {
  return changes.some(
    (change) =>
      (change.type === "position" && change.dragging === true) ||
      (change.type === "dimensions" && change.resizing === true),
  );
}

function isInteractionEndChange(changes: NodeChange[]): boolean {
  return changes.some(
    (change) =>
      (change.type === "position" && change.dragging === false) ||
      (change.type === "dimensions" && change.resizing === false),
  );
}

function ConnectionInProgressFlag() {
  const inProgress = useConnection((connection) => connection.inProgress);
  return <span hidden data-connecting={inProgress ? "true" : "false"} />;
}

export function FlowCanvasShell({
  testId,
  nodes: modelNodes,
  edges: modelEdges,
  nodeTypes,
  onSelectedNodeChange,
  onSelectedEdgeChange,
  onNodeDoubleClick,
  children,
}: FlowCanvasShellProps) {
  const overlay = useDocumentStore((state) => state.document.overlay);
  const canvasMode = useCanvasMode();
  const previewViewport = usePreviewViewport();
  const isPreview = canvasMode === "preview";
  const {
    onConnect,
    onDragOver,
    onDrop,
    onPaneClick,
    onEdgeClick,
    onNodeDragStop,
    onNodesDelete,
    onEdgesDelete,
    onSelectionChange,
    onMoveEnd,
  } = useFlowCanvasCallbacks({ onSelectedNodeChange, onSelectedEdgeChange });

  const wrappedNodeTypes = useMemo(
    () => (isPreview ? nodeTypes : wrapNodeTypes(nodeTypes)),
    [isPreview, nodeTypes],
  );
  const [nodes, setNodes] = useState<Node[]>(modelNodes);
  const [edges, setEdges] = useState<Edge[]>(modelEdges);
  const interactingRef = useRef(false);

  useLayoutEffect(() => {
    if (interactingRef.current) {
      return;
    }
    setNodes((previous) => preserveSelected(modelNodes, previous));
  }, [modelNodes]);

  useLayoutEffect(() => {
    if (interactingRef.current) {
      return;
    }
    setEdges((previous) => preserveSelected(modelEdges, previous));
  }, [modelEdges]);

  const extraColors = useMemo(
    () =>
      extraStrokeColors(
        modelEdges.map((edge) => {
          const data = edge.data as UmlEdgeData | undefined;
          return data?.strokeColor;
        }),
      ),
    [modelEdges],
  );

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    if (isInteractingChange(changes)) {
      interactingRef.current = true;
    }
    if (isInteractionEndChange(changes)) {
      interactingRef.current = false;
    }
    setNodes((current) => applyNodeDimensionData(applyNodeChanges(changes, current), changes));
  }, []);

  const onEdgesChange = useCallback((changes: Parameters<typeof applyEdgeChanges>[0]) => {
    setEdges((current) => applyEdgeChanges(changes, current));
  }, []);

  const defaultViewport = isPreview
    ? (previewViewport ?? DEFAULT_VIEWPORT)
    : (overlay.viewport ?? DEFAULT_VIEWPORT);

  return (
    <div
      className={`graphiq-flow-canvas h-full w-full ${isPreview ? "bg-transparent" : "bg-[var(--color-canvas)]"}`}
      data-testid={testId}
      data-canvas-mode={canvasMode}
    >
      <ReactFlow
        key={
          isPreview
            ? `preview-${defaultViewport.x}-${defaultViewport.y}-${defaultViewport.zoom}`
            : "editor"
        }
        {...FLOW_CANVAS_DEFAULTS}
        nodes={nodes}
        edges={edges}
        nodeTypes={wrappedNodeTypes}
        edgeTypes={edgeTypes}
        onConnect={isPreview ? undefined : onConnect}
        onDragOver={isPreview ? undefined : onDragOver}
        onDrop={isPreview ? undefined : onDrop}
        onPaneClick={isPreview ? undefined : onPaneClick}
        onEdgeClick={isPreview ? undefined : onEdgeClick}
        onNodeDragStop={isPreview ? undefined : onNodeDragStop}
        onNodesDelete={isPreview ? undefined : onNodesDelete}
        onEdgesDelete={isPreview ? undefined : onEdgesDelete}
        onNodeDoubleClick={isPreview ? undefined : onNodeDoubleClick}
        onSelectionChange={isPreview ? undefined : onSelectionChange}
        onMoveEnd={isPreview ? undefined : onMoveEnd}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodesDraggable={!isPreview}
        nodesConnectable={!isPreview}
        elementsSelectable={!isPreview}
        nodesFocusable={!isPreview}
        edgesFocusable={!isPreview}
        panOnDrag={!isPreview}
        zoomOnScroll={!isPreview}
        zoomOnPinch={!isPreview}
        zoomOnDoubleClick={false}
        preventScrolling={!isPreview}
        deleteKeyCode={isPreview ? [] : FLOW_CANVAS_DEFAULTS.deleteKeyCode}
        onlyRenderVisibleElements={!isPreview}
        defaultViewport={defaultViewport}
        minZoom={FLOW_CANVAS_DEFAULTS.minZoom}
        maxZoom={FLOW_CANVAS_DEFAULTS.maxZoom}
        proOptions={FLOW_CANVAS_DEFAULTS.proOptions}
      >
        <MarkerDefs extraColors={extraColors} />
        {isPreview ? null : <ConnectionInProgressFlag />}
        {isPreview ? null : <GraphiqFlowBackground />}
        {isPreview ? null : <CanvasControls />}
      </ReactFlow>
      {children}
    </div>
  );
}
