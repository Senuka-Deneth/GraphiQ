import { ReactFlowProvider, type Node } from "@xyflow/react";
import { useCallback, useMemo } from "react";
import { FlowCanvasShell } from "../FlowCanvasShell.js";
import { useDocumentStore } from "../../store/documentStore.js";
import { ClassNode, classNodeTypeName } from "./ClassNode.js";
import { modelToFlow } from "./modelToFlow.js";
import { NoteNode, noteNodeTypeName } from "./NoteNode.js";

const nodeTypes = {
  [classNodeTypeName]: ClassNode,
  [noteNodeTypeName]: NoteNode,
} as const;

type ClassCanvasInnerProps = {
  onSelectedNodeChange?: (nodeId: string | null) => void;
  onSelectedEdgeChange?: (edgeId: string | null) => void;
  editMemberTriggerRef?: React.RefObject<HTMLButtonElement | null>;
  selectedNodeId?: string | null;
};

function ClassCanvasInner({
  onSelectedNodeChange,
  onSelectedEdgeChange,
  editMemberTriggerRef,
  selectedNodeId,
}: ClassCanvasInnerProps) {
  const model = useDocumentStore((state) => state.document.model);
  const overlay = useDocumentStore((state) => state.document.overlay);
  const diagnostics = useDocumentStore((state) => state.diagnostics);
  const editFirstAttribute = useDocumentStore((state) => state.editFirstAttribute);
  const renameSelectedElement = useDocumentStore((state) => state.renameSelectedElement);

  const { nodes, edges } = useMemo(
    () => modelToFlow(model, overlay, diagnostics),
    [model, overlay, diagnostics],
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

  return (
    <FlowCanvasShell
      testId="class-canvas"
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onSelectedNodeChange={onSelectedNodeChange}
      onSelectedEdgeChange={onSelectedEdgeChange}
      onNodeDoubleClick={onNodeDoubleClick}
    >
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
    </FlowCanvasShell>
  );
}

type ClassCanvasProps = {
  onSelectedNodeChange?: (nodeId: string | null) => void;
  onSelectedEdgeChange?: (edgeId: string | null) => void;
  editMemberTriggerRef?: React.RefObject<HTMLButtonElement | null>;
  selectedNodeId?: string | null;
};

export function ClassCanvas({
  onSelectedNodeChange,
  onSelectedEdgeChange,
  editMemberTriggerRef,
  selectedNodeId,
}: ClassCanvasProps) {
  return (
    <ReactFlowProvider>
      <ClassCanvasInner
        onSelectedNodeChange={onSelectedNodeChange}
        onSelectedEdgeChange={onSelectedEdgeChange}
        editMemberTriggerRef={editMemberTriggerRef}
        selectedNodeId={selectedNodeId}
      />
    </ReactFlowProvider>
  );
}
