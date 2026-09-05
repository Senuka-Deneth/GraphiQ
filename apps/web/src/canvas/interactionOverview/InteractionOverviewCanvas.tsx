import {
  Background,
  Controls,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Connection,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useCallback, useMemo } from "react";
import { NoteNode, noteNodeTypeName } from "../class/NoteNode.js";
import { MarkerDefs } from "../class/MarkerDefs.js";
import { UmlEdge, umlEdgeTypeName } from "../class/UmlEdge.js";
import { ControlNode, controlNodeTypeName } from "../activity/ControlNode.js";
import {
  useDocumentStore,
  type InteractionOverviewStencilDropKind,
} from "../../store/documentStore.js";
import { InteractionUseNode, interactionUseNodeTypeName } from "./InteractionUseNode.js";
import { interactionOverviewModelToFlow } from "./modelToFlow.js";

const nodeTypes = {
  [interactionUseNodeTypeName]: InteractionUseNode,
  [controlNodeTypeName]: ControlNode,
  [noteNodeTypeName]: NoteNode,
} as const;

const edgeTypes = {
  [umlEdgeTypeName]: UmlEdge,
} as const;

type InteractionOverviewCanvasInnerProps = {
  onSelectedNodeChange?: (nodeId: string | null) => void;
};

function InteractionOverviewCanvasInner({
  onSelectedNodeChange,
}: InteractionOverviewCanvasInnerProps) {
  const model = useDocumentStore((state) => state.document.model);
  const overlay = useDocumentStore((state) => state.document.overlay);
  const diagnostics = useDocumentStore((state) => state.diagnostics);
  const updateNodePosition = useDocumentStore((state) => state.updateNodePosition);
  const dropStencilElement = useDocumentStore((state) => state.dropStencilElement);
  const connectElements = useDocumentStore((state) => state.connectElements);
  const deleteElements = useDocumentStore((state) => state.deleteElements);
  const deleteRelationships = useDocumentStore((state) => state.deleteRelationships);
  const renameSelectedElement = useDocumentStore((state) => state.renameSelectedElement);

  const { screenToFlowPosition } = useReactFlow();

  const { nodes, edges } = useMemo(
    () => interactionOverviewModelToFlow(model, overlay, diagnostics),
    [model, overlay, diagnostics],
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      if (connection.source && connection.target) {
        void connectElements(connection.source, connection.target);
      }
    },
    [connectElements],
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const kind = event.dataTransfer.getData(
        "application/graphiq-stencil",
      ) as InteractionOverviewStencilDropKind;
      if (!kind) {
        return;
      }

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      void dropStencilElement(kind, position.x, position.y);
    },
    [dropStencilElement, screenToFlowPosition],
  );

  const onNodeDragStop = useCallback(
    (_event: MouseEvent | TouchEvent, node: Node) => {
      updateNodePosition(node.id, node.position.x, node.position.y);
    },
    [updateNodePosition],
  );

  const onNodesDelete = useCallback(
    (deletedNodes: Node[]) => {
      void deleteElements(deletedNodes.map((node) => node.id));
    },
    [deleteElements],
  );

  const onEdgesDelete = useCallback(
    (deletedEdges: Edge[]) => {
      void deleteRelationships(deletedEdges.map((edge) => edge.id));
    },
    [deleteRelationships],
  );

  const onNodeDoubleClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      const currentName =
        typeof node.data === "object" &&
        node.data !== null &&
        "label" in node.data &&
        typeof node.data.label === "string"
          ? node.data.label
          : "";
      const nextName = window.prompt("Rename element", currentName);
      if (nextName !== null && nextName.trim().length > 0) {
        void renameSelectedElement(node.id, nextName.trim());
      }
    },
    [renameSelectedElement],
  );

  const onSelectionChange = useCallback(
    ({ nodes: selectedNodes }: { nodes: Node[] }) => {
      onSelectedNodeChange?.(selectedNodes.length === 1 ? (selectedNodes[0]?.id ?? null) : null);
    },
    [onSelectedNodeChange],
  );

  return (
    <div className="h-full w-full" data-testid="interaction-overview-canvas">
      <MarkerDefs />
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onConnect={onConnect}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onNodeDragStop={onNodeDragStop}
        onNodesDelete={onNodesDelete}
        onEdgesDelete={onEdgesDelete}
        onNodeDoubleClick={onNodeDoubleClick}
        onSelectionChange={onSelectionChange}
        fitView
        snapToGrid
        snapGrid={[8, 8]}
        minZoom={0.25}
        maxZoom={2}
        deleteKeyCode={["Backspace", "Delete"]}
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={8} size={1} color="#cbd5e1" />
        <Controls />
      </ReactFlow>
    </div>
  );
}

type InteractionOverviewCanvasProps = {
  onSelectedNodeChange?: (nodeId: string | null) => void;
};

export function InteractionOverviewCanvas({
  onSelectedNodeChange,
}: InteractionOverviewCanvasProps) {
  return (
    <ReactFlowProvider>
      <InteractionOverviewCanvasInner onSelectedNodeChange={onSelectedNodeChange} />
    </ReactFlowProvider>
  );
}
