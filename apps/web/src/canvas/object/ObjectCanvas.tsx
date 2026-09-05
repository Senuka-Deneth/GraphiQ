import { ReactFlowProvider, type Node } from "@xyflow/react";
import { useCallback, useMemo } from "react";
import { NoteNode, noteNodeTypeName } from "../class/NoteNode.js";
import { FlowCanvasShell } from "../FlowCanvasShell.js";
import { renameNodeFromPrompt } from "../renameNodeFromPrompt.js";
import { useDocumentStore } from "../../store/documentStore.js";
import { InstanceNode, instanceNodeTypeName } from "./InstanceNode.js";
import { objectModelToFlow } from "./modelToFlow.js";

const nodeTypes = {
  [instanceNodeTypeName]: InstanceNode,
  [noteNodeTypeName]: NoteNode,
} as const;

type ObjectCanvasInnerProps = {
  onSelectedNodeChange?: (nodeId: string | null) => void;
  onSelectedEdgeChange?: (edgeId: string | null) => void;
};

function ObjectCanvasInner({
  onSelectedNodeChange,
  onSelectedEdgeChange,
}: ObjectCanvasInnerProps) {
  const model = useDocumentStore((state) => state.document.model);
  const overlay = useDocumentStore((state) => state.document.overlay);
  const diagnostics = useDocumentStore((state) => state.diagnostics);
  const renameSelectedElement = useDocumentStore((state) => state.renameSelectedElement);
  const { nodes, edges } = useMemo(
    () => objectModelToFlow(model, overlay, diagnostics),
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
      testId="object-canvas"
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onSelectedNodeChange={onSelectedNodeChange}
      onSelectedEdgeChange={onSelectedEdgeChange}
      onNodeDoubleClick={onNodeDoubleClick}
    />
  );
}

type ObjectCanvasProps = {
  onSelectedNodeChange?: (nodeId: string | null) => void;
  onSelectedEdgeChange?: (edgeId: string | null) => void;
};

export function ObjectCanvas(props: ObjectCanvasProps) {
  return (
    <ReactFlowProvider>
      <ObjectCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
