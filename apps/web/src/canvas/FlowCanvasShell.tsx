import {
  Controls,
  ReactFlow,
  type Edge,
  type Node,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { MouseEvent, ReactNode } from "react";
import { MarkerDefs } from "./class/MarkerDefs.js";
import { UmlEdge, umlEdgeTypeName } from "./class/UmlEdge.js";
import { DEFAULT_VIEWPORT, FLOW_CANVAS_DEFAULTS } from "./canvasDefaults.js";
import { GraphiqFlowBackground } from "./GraphiqFlowBackground.js";
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

export function FlowCanvasShell({
  testId,
  nodes,
  edges,
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

  return (
    <div className="h-full w-full" data-testid={testId}>
      <MarkerDefs />
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
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
        defaultViewport={overlay.viewport ?? DEFAULT_VIEWPORT}
        {...FLOW_CANVAS_DEFAULTS}
      >
        <GraphiqFlowBackground />
        <Controls />
      </ReactFlow>
      {children}
    </div>
  );
}
