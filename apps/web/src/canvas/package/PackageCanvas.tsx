import { ReactFlowProvider, type Node } from "@xyflow/react";
import { useCallback, useMemo } from "react";
import { ClassNode, classNodeTypeName } from "../class/ClassNode.js";
import { NoteNode, noteNodeTypeName } from "../class/NoteNode.js";
import { FlowCanvasShell } from "../FlowCanvasShell.js";
import { renameNodeFromPrompt } from "../renameNodeFromPrompt.js";
import { useDocumentStore } from "../../store/documentStore.js";
import { PackageNode, packageNodeTypeName } from "./PackageNode.js";
import { packageModelToFlow } from "./modelToFlow.js";

const nodeTypes = {
  [packageNodeTypeName]: PackageNode,
  [classNodeTypeName]: ClassNode,
  [noteNodeTypeName]: NoteNode,
} as const;

type CanvasProps = {
  onSelectedNodeChange?: (nodeId: string | null) => void;
  onSelectedEdgeChange?: (edgeId: string | null) => void;
};

function PackageCanvasInner({ onSelectedNodeChange, onSelectedEdgeChange }: CanvasProps) {
  const model = useDocumentStore((state) => state.document.model);
  const overlay = useDocumentStore((state) => state.document.overlay);
  const diagnostics = useDocumentStore((state) => state.diagnostics);
  const renameSelectedElement = useDocumentStore((state) => state.renameSelectedElement);
  const { nodes, edges } = useMemo(
    () => packageModelToFlow(model, overlay, diagnostics),
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
      testId="package-canvas"
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onSelectedNodeChange={onSelectedNodeChange}
      onSelectedEdgeChange={onSelectedEdgeChange}
      onNodeDoubleClick={onNodeDoubleClick}
    />
  );
}

export function PackageCanvas(props: CanvasProps) {
  return (
    <ReactFlowProvider>
      <PackageCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
