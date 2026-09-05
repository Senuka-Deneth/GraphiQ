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

  const wrappedNodeTypes = useMemo(() => wrapNodeTypes(nodeTypes), [nodeTypes]);
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

  return (
    <div
      className="graphiq-flow-canvas h-full w-full bg-[var(--color-canvas)]"
      data-testid={testId}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={wrappedNodeTypes}
        edgeTypes={edgeTypes}
        onConnect={onConnect}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onPaneClick={onPaneClick}
        onEdgeClick={onEdgeClick}
        onNodeDragStop={onNodeDragStop}
        onNodesDelete={onNodesDelete}
        onEdgesDelete={onEdgesDelete}
        onNodeDoubleClick={onNodeDoubleClick}
        onSelectionChange={onSelectionChange}
        onMoveEnd={onMoveEnd}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onlyRenderVisibleElements
        defaultViewport={overlay.viewport ?? DEFAULT_VIEWPORT}
        {...FLOW_CANVAS_DEFAULTS}
      >
        <MarkerDefs extraColors={extraColors} />
        <ConnectionInProgressFlag />
        <GraphiqFlowBackground />
        <CanvasControls />
      </ReactFlow>
      {children}
    </div>
  );
}
