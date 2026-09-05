import { ReactFlowProvider, type Node } from "@xyflow/react";
import { useCallback, useMemo } from "react";
import { NoteNode, noteNodeTypeName } from "../class/NoteNode.js";
import { FlowCanvasShell } from "../FlowCanvasShell.js";
import { renameNodeFromPrompt } from "../renameNodeFromPrompt.js";
import { useDocumentStore } from "../../store/documentStore.js";
import { ArtifactNode, artifactNodeTypeName } from "./ArtifactNode.js";
import { ComponentNode, componentNodeTypeName } from "./ComponentNode.js";
import { InterfaceLollipopNode, interfaceLollipopNodeTypeName } from "./InterfaceLollipopNode.js";
import { componentModelToFlow } from "./modelToFlow.js";
import { PortNode, portNodeTypeName } from "./PortNode.js";

const nodeTypes = {
  [componentNodeTypeName]: ComponentNode,
  [interfaceLollipopNodeTypeName]: InterfaceLollipopNode,
  [portNodeTypeName]: PortNode,
  [artifactNodeTypeName]: ArtifactNode,
  [noteNodeTypeName]: NoteNode,
} as const;

type CanvasProps = {
  onSelectedNodeChange?: (nodeId: string | null) => void;
  onSelectedEdgeChange?: (edgeId: string | null) => void;
};

function ComponentCanvasInner({ onSelectedNodeChange, onSelectedEdgeChange }: CanvasProps) {
  const model = useDocumentStore((state) => state.document.model);
  const overlay = useDocumentStore((state) => state.document.overlay);
  const diagnostics = useDocumentStore((state) => state.diagnostics);
  const renameSelectedElement = useDocumentStore((state) => state.renameSelectedElement);
  const { nodes, edges } = useMemo(
    () => componentModelToFlow(model, overlay, diagnostics),
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
      testId="component-canvas"
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onSelectedNodeChange={onSelectedNodeChange}
      onSelectedEdgeChange={onSelectedEdgeChange}
      onNodeDoubleClick={onNodeDoubleClick}
    />
  );
}

export function ComponentCanvas(props: CanvasProps) {
  return (
    <ReactFlowProvider>
      <ComponentCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
