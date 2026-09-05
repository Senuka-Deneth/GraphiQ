import { ReactFlowProvider, type Node } from "@xyflow/react";
import { useCallback, useMemo } from "react";
import { ClassNode, classNodeTypeName } from "../class/ClassNode.js";
import { NoteNode, noteNodeTypeName } from "../class/NoteNode.js";
import { FlowCanvasShell } from "../FlowCanvasShell.js";
import { renameNodeFromPrompt } from "../renameNodeFromPrompt.js";
import { useDocumentStore } from "../../store/documentStore.js";
import { ProfileFrameNode, profileFrameNodeTypeName } from "./ProfileFrameNode.js";
import { profileModelToFlow } from "./modelToFlow.js";

const nodeTypes = {
  [classNodeTypeName]: ClassNode,
  [noteNodeTypeName]: NoteNode,
  [profileFrameNodeTypeName]: ProfileFrameNode,
} as const;

type CanvasProps = {
  onSelectedNodeChange?: (nodeId: string | null) => void;
  onSelectedEdgeChange?: (edgeId: string | null) => void;
};

function ProfileCanvasInner({ onSelectedNodeChange, onSelectedEdgeChange }: CanvasProps) {
  const model = useDocumentStore((state) => state.document.model);
  const overlay = useDocumentStore((state) => state.document.overlay);
  const diagnostics = useDocumentStore((state) => state.diagnostics);
  const renameSelectedElement = useDocumentStore((state) => state.renameSelectedElement);
  const { nodes, edges } = useMemo(
    () => profileModelToFlow(model, overlay, diagnostics),
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
      testId="profile-canvas"
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onSelectedNodeChange={onSelectedNodeChange}
      onSelectedEdgeChange={onSelectedEdgeChange}
      onNodeDoubleClick={onNodeDoubleClick}
    />
  );
}

export function ProfileCanvas(props: CanvasProps) {
  return (
    <ReactFlowProvider>
      <ProfileCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
