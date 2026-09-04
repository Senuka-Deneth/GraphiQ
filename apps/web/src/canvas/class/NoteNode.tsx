import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";

export type NoteNodeData = {
  label: string;
  width: number;
  height: number;
};

export const noteNodeTypeName = "noteNode" as const;

export type NoteFlowNode = Node<NoteNodeData, typeof noteNodeTypeName>;

export function NoteNode({ data }: NodeProps<NoteFlowNode>) {
  return (
    <div
      className="rounded-sm border border-amber-500 bg-amber-50 px-2 py-2 text-sm text-amber-950 shadow-sm"
      style={{
        width: data.width,
        minHeight: data.height,
      }}
    >
      <Handle type="target" position={Position.Top} className="!bg-amber-600" />
      <Handle type="source" position={Position.Bottom} className="!bg-amber-600" />
      <Handle type="target" position={Position.Left} className="!bg-amber-600" />
      <Handle type="source" position={Position.Right} className="!bg-amber-600" />
      {data.label}
    </div>
  );
}
