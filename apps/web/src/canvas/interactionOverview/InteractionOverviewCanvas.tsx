import { ReactFlowProvider, type Node } from "@xyflow/react";
import { useCallback, useMemo } from "react";
import { ControlNode, controlNodeTypeName } from "../activity/ControlNode.js";
import { NoteNode, noteNodeTypeName } from "../class/NoteNode.js";
import { FlowCanvasShell } from "../FlowCanvasShell.js";
import { renameNodeFromPrompt } from "../renameNodeFromPrompt.js";
import { useDocumentStore } from "../../store/documentStore.js";
import { InteractionUseNode, interactionUseNodeTypeName } from "./InteractionUseNode.js";
import { interactionOverviewModelToFlow } from "./modelToFlow.js";

const nodeTypes = {
  [interactionUseNodeTypeName]: InteractionUseNode,
  [controlNodeTypeName]: ControlNode,
  [noteNodeTypeName]: NoteNode,
} as const;

type CanvasProps = {
  onSelectedNodeChange?: (nodeId: string | null) => void;
  onSelectedEdgeChange?: (edgeId: string | null) => void;
};

function InteractionOverviewCanvasInner({
  onSelectedNodeChange,
  onSelectedEdgeChange,
}: CanvasProps) {
  const model = useDocumentStore((state) => state.document.model);
  const overlay = useDocumentStore((state) => state.document.overlay);
  const diagnostics = useDocumentStore((state) => state.diagnostics);
  const renameSelectedElement = useDocumentStore((state) => state.renameSelectedElement);
  const { nodes, edges } = useMemo(
    () => interactionOverviewModelToFlow(model, overlay, diagnostics),
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
      testId="interaction-overview-canvas"
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onSelectedNodeChange={onSelectedNodeChange}
      onSelectedEdgeChange={onSelectedEdgeChange}
      onNodeDoubleClick={onNodeDoubleClick}
    />
  );
}

export function InteractionOverviewCanvas(props: CanvasProps) {
  return (
    <ReactFlowProvider>
      <InteractionOverviewCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
