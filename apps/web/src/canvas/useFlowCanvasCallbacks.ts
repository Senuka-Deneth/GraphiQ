import { useCallback, type DragEvent, type MouseEvent as ReactMouseEvent } from "react";
import {
  useReactFlow,
  type Connection,
  type Edge,
  type Node,
  type OnSelectionChangeParams,
} from "@xyflow/react";
import {
  useDocumentStore,
  type StencilDropKind,
} from "../store/documentStore.js";

type FlowCanvasCallbacksOptions = {
  onSelectedNodeChange?: (nodeId: string | null) => void;
  onSelectedEdgeChange?: (edgeId: string | null) => void;
  promptForDroppedText?: boolean;
};

export function useFlowCanvasCallbacks({
  onSelectedNodeChange,
  onSelectedEdgeChange,
  promptForDroppedText = true,
}: FlowCanvasCallbacksOptions) {
  const updateNodePosition = useDocumentStore((state) => state.updateNodePosition);
  const dropStencilElement = useDocumentStore((state) => state.dropStencilElement);
  const connectElements = useDocumentStore((state) => state.connectElements);
  const deleteElements = useDocumentStore((state) => state.deleteElements);
  const deleteRelationships = useDocumentStore((state) => state.deleteRelationships);
  const renameSelectedElement = useDocumentStore((state) => state.renameSelectedElement);
  const updateViewport = useDocumentStore((state) => state.updateViewport);

  const { screenToFlowPosition } = useReactFlow();

  const onConnect = useCallback(
    (connection: Connection) => {
      if (connection.source && connection.target) {
        void connectElements(connection.source, connection.target);
      }
    },
    [connectElements],
  );

  const onDragOver = useCallback((event: DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const dropAtClientPoint = useCallback(
    async (kind: StencilDropKind, clientX: number, clientY: number) => {
      const position = screenToFlowPosition({ x: clientX, y: clientY });
      await dropStencilElement(kind, position.x, position.y);
      if (kind !== "text" || !promptForDroppedText) {
        return;
      }
      const last = useDocumentStore.getState().document.model.elements.at(-1);
      if (last?.elementType !== "note") {
        return;
      }
      const nextName = window.prompt("Text", last.name);
      if (nextName !== null && nextName.trim().length > 0) {
        await renameSelectedElement(last.id, nextName.trim());
      }
    },
    [dropStencilElement, promptForDroppedText, renameSelectedElement, screenToFlowPosition],
  );

  const onDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault();
      const kind = event.dataTransfer.getData("application/graphiq-stencil") as StencilDropKind;
      if (!kind) {
        return;
      }
      void dropAtClientPoint(kind, event.clientX, event.clientY);
    },
    [dropAtClientPoint],
  );

  const onPaneClick = useCallback(
    (event: ReactMouseEvent) => {
      if (event.detail === 2) {
        void dropAtClientPoint("text", event.clientX, event.clientY);
        return;
      }
      const target = event.target;
      if (target instanceof Element && target.closest(".react-flow__edge")) {
        return;
      }
      onSelectedEdgeChange?.(null);
    },
    [dropAtClientPoint, onSelectedEdgeChange],
  );

  const onEdgeClick = useCallback(
    (_event: ReactMouseEvent, edge: Edge) => {
      onSelectedNodeChange?.(null);
      onSelectedEdgeChange?.(edge.id);
    },
    [onSelectedEdgeChange, onSelectedNodeChange],
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

  const onSelectionChange = useCallback(
    ({ nodes: selectedNodes, edges: selectedEdges }: OnSelectionChangeParams) => {
      onSelectedNodeChange?.(
        selectedNodes.length === 1 ? (selectedNodes[0]?.id ?? null) : null,
      );
      if (selectedEdges.length === 1) {
        onSelectedEdgeChange?.(selectedEdges[0]?.id ?? null);
        return;
      }
      if (selectedNodes.length > 0) {
        onSelectedEdgeChange?.(null);
      }
    },
    [onSelectedEdgeChange, onSelectedNodeChange],
  );

  const onMoveEnd = useCallback(
    (_event: MouseEvent | TouchEvent | null, viewport: { x: number; y: number; zoom: number }) => {
      updateViewport(viewport);
    },
    [updateViewport],
  );

  return {
    onConnect,
    onDragOver,
    onDrop,
    onPaneClick,
    onEdgeClick,
    onNodeDragStop,
    onNodesDelete,
    onEdgesDelete,
    onSelectionChange,
    onMoveEnd,
    renameSelectedElement,
  };
}
