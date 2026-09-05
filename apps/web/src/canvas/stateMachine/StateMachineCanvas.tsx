import { ReactFlowProvider, type Node } from "@xyflow/react";
import { useCallback, useMemo } from "react";
import { NoteNode, noteNodeTypeName } from "../class/NoteNode.js";
import { FlowCanvasShell } from "../FlowCanvasShell.js";
import { renameNodeFromPrompt } from "../renameNodeFromPrompt.js";
import { useDocumentStore } from "../../store/documentStore.js";
import { RegionNode, regionNodeTypeName } from "./RegionNode.js";
import { StateNode, stateNodeTypeName } from "./StateNode.js";
import { stateMachineModelToFlow } from "./modelToFlow.js";
import { VertexNode, vertexNodeTypeName } from "./VertexNode.js";

const nodeTypes = {
  [stateNodeTypeName]: StateNode,
  [regionNodeTypeName]: RegionNode,
  [vertexNodeTypeName]: VertexNode,
  [noteNodeTypeName]: NoteNode,
} as const;

type CanvasProps = {
  onSelectedNodeChange?: (nodeId: string | null) => void;
  onSelectedEdgeChange?: (edgeId: string | null) => void;
};

function StateMachineCanvasInner({ onSelectedNodeChange, onSelectedEdgeChange }: CanvasProps) {
  const model = useDocumentStore((state) => state.document.model);
  const overlay = useDocumentStore((state) => state.document.overlay);
  const diagnostics = useDocumentStore((state) => state.diagnostics);
  const renameSelectedElement = useDocumentStore((state) => state.renameSelectedElement);
  const { nodes, edges } = useMemo(
    () => stateMachineModelToFlow(model, overlay, diagnostics),
    [model, overlay, diagnostics],
  );
  const onNodeDoubleClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      renameNodeFromPrompt(node, renameSelectedElement);
    },
    [renameSelectedElement],
  );

  return (
    <FlowCanvasShell
      testId="state-machine-canvas"
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onSelectedNodeChange={onSelectedNodeChange}
      onSelectedEdgeChange={onSelectedEdgeChange}
      onNodeDoubleClick={onNodeDoubleClick}
    />
  );
}

export function StateMachineCanvas(props: CanvasProps) {
  return (
    <ReactFlowProvider>
      <StateMachineCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
