import { ReactFlowProvider, type Node } from "@xyflow/react";
import { useCallback, useMemo } from "react";
import { NoteNode, noteNodeTypeName } from "../class/NoteNode.js";
import { FlowCanvasShell } from "../FlowCanvasShell.js";
import { renameNodeFromPrompt } from "../renameNodeFromPrompt.js";
import { useDocumentStore } from "../../store/documentStore.js";
import { ActionNode, actionNodeTypeName } from "./ActionNode.js";
import { ControlNode, controlNodeTypeName } from "./ControlNode.js";
import { InterruptibleNode, interruptibleNodeTypeName } from "./InterruptibleNode.js";
import { activityModelToFlow } from "./modelToFlow.js";
import { PartitionNode, partitionNodeTypeName } from "./PartitionNode.js";

const nodeTypes = {
  [partitionNodeTypeName]: PartitionNode,
  [interruptibleNodeTypeName]: InterruptibleNode,
  [actionNodeTypeName]: ActionNode,
  [controlNodeTypeName]: ControlNode,
  [noteNodeTypeName]: NoteNode,
} as const;

type CanvasProps = {
  onSelectedNodeChange?: (nodeId: string | null) => void;
  onSelectedEdgeChange?: (edgeId: string | null) => void;
};

function ActivityCanvasInner({ onSelectedNodeChange, onSelectedEdgeChange }: CanvasProps) {
  const model = useDocumentStore((state) => state.document.model);
  const overlay = useDocumentStore((state) => state.document.overlay);
  const diagnostics = useDocumentStore((state) => state.diagnostics);
  const renameSelectedElement = useDocumentStore((state) => state.renameSelectedElement);
  const { nodes, edges } = useMemo(
    () => activityModelToFlow(model, overlay, diagnostics),
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
      testId="activity-canvas"
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onSelectedNodeChange={onSelectedNodeChange}
      onSelectedEdgeChange={onSelectedEdgeChange}
      onNodeDoubleClick={onNodeDoubleClick}
    />
  );
}

export function ActivityCanvas(props: CanvasProps) {
  return (
    <ReactFlowProvider>
      <ActivityCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
