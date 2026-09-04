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
import {
  useDocumentStore,
  type StencilDropKind,
} from "../../store/documentStore.js";
import { ClassNode, classNodeTypeName } from "./ClassNode.js";
import { MarkerDefs } from "./MarkerDefs.js";
import { modelToFlow } from "./modelToFlow.js";
import { NoteNode, noteNodeTypeName } from "./NoteNode.js";
import { UmlEdge, umlEdgeTypeName } from "./UmlEdge.js";

const nodeTypes = {
  [classNodeTypeName]: ClassNode,
  [noteNodeTypeName]: NoteNode,
} as const;

const edgeTypes = {
  [umlEdgeTypeName]: UmlEdge,
} as const;

type ClassCanvasInnerProps = {
  onSelectedNodeChange?: (nodeId: string | null) => void;
  editMemberTriggerRef?: React.RefObject<HTMLButtonElement | null>;
  selectedNodeId?: string | null;
};

function ClassCanvasInner({
  onSelectedNodeChange,
  editMemberTriggerRef,
  selectedNodeId,
}: ClassCanvasInnerProps) {
  const model = useDocumentStore((state) => state.document.model);
  const overlay = useDocumentStore((state) => state.document.overlay);
  const updateNodePosition = useDocumentStore((state) => state.updateNodePosition);
  const dropStencilElement = useDocumentStore((state) => state.dropStencilElement);
  const connectElements = useDocumentStore((state) => state.connectElements);
  const deleteElements = useDocumentStore((state) => state.deleteElements);
  const deleteRelationships = useDocumentStore((state) => state.deleteRelationships);
  const renameSelectedElement = useDocumentStore((state) => state.renameSelectedElement);
  const editFirstAttribute = useDocumentStore((state) => state.editFirstAttribute);

  const { screenToFlowPosition } = useReactFlow();

  const { nodes, edges } = useMemo(
    () => modelToFlow(model, overlay),
    [model, overlay],
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
      const kind = event.dataTransfer.getData("application/graphiq-stencil") as StencilDropKind;
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
    <div className="h-full w-full" data-testid="class-canvas">
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
      <button
        ref={editMemberTriggerRef}
        type="button"
        className="hidden"
        data-testid="edit-member-trigger"
        onClick={() => {
          if (selectedNodeId === null || selectedNodeId === undefined) {
            return;
          }
          const element = model.elements.find((item) => item.id === selectedNodeId);
          if (element?.elementType !== "class") {
            return;
          }
          const attribute = element.attributes[0];
          const current = attribute
            ? `${attribute.visibility === "public" ? "+" : attribute.visibility === "private" ? "-" : attribute.visibility === "protected" ? "#" : "~"}${attribute.name}: ${attribute.typeName}`
            : "-field: String";
          const nextValue = window.prompt("Edit first attribute", current);
          if (nextValue !== null) {
            void editFirstAttribute(selectedNodeId, nextValue);
          }
        }}
      />
    </div>
  );
}

type ClassCanvasProps = {
  onSelectedNodeChange?: (nodeId: string | null) => void;
  editMemberTriggerRef?: React.RefObject<HTMLButtonElement | null>;
  selectedNodeId?: string | null;
};

export function ClassCanvas({
  onSelectedNodeChange,
  editMemberTriggerRef,
  selectedNodeId,
}: ClassCanvasProps) {
  return (
    <ReactFlowProvider>
      <ClassCanvasInner
        onSelectedNodeChange={onSelectedNodeChange}
        editMemberTriggerRef={editMemberTriggerRef}
        selectedNodeId={selectedNodeId}
      />
    </ReactFlowProvider>
  );
}
