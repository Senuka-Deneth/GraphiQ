import { ReactFlowProvider, type Node } from "@xyflow/react";
import { useCallback, useMemo } from "react";
import { NoteNode, noteNodeTypeName } from "../class/NoteNode.js";
import { PortNode, portNodeTypeName } from "../component/PortNode.js";
import { FlowCanvasShell } from "../FlowCanvasShell.js";
import { renameNodeFromPrompt } from "../renameNodeFromPrompt.js";
import { useDocumentStore } from "../../store/documentStore.js";
import { FrameNode, frameNodeTypeName } from "./FrameNode.js";
import { PartNode, partNodeTypeName } from "./PartNode.js";
import { compositeStructureModelToFlow } from "./modelToFlow.js";

const nodeTypes = {
  [frameNodeTypeName]: FrameNode,
  [partNodeTypeName]: PartNode,
  [portNodeTypeName]: PortNode,
  [noteNodeTypeName]: NoteNode,
} as const;

type CanvasProps = {
  onSelectedNodeChange?: (nodeId: string | null) => void;
  onSelectedEdgeChange?: (edgeId: string | null) => void;
};

function CompositeStructureCanvasInner({
  onSelectedNodeChange,
  onSelectedEdgeChange,
}: CanvasProps) {
  const model = useDocumentStore((state) => state.document.model);
  const overlay = useDocumentStore((state) => state.document.overlay);
  const diagnostics = useDocumentStore((state) => state.diagnostics);
  const renameSelectedElement = useDocumentStore((state) => state.renameSelectedElement);
  const { nodes, edges } = useMemo(
    () => compositeStructureModelToFlow(model, overlay, diagnostics),
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
      testId="composite-structure-canvas"
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onSelectedNodeChange={onSelectedNodeChange}
      onSelectedEdgeChange={onSelectedEdgeChange}
      onNodeDoubleClick={onNodeDoubleClick}
    />
  );
}

export function CompositeStructureCanvas(props: CanvasProps) {
  return (
    <ReactFlowProvider>
      <CompositeStructureCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
