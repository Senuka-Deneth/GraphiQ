import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";

export type NoteNodeData = {
  label: string;
  width: number;
  height: number;
  diagnosticSeverity?: "error" | "warning";
};

export const noteNodeTypeName = "noteNode" as const;

export type NoteFlowNode = Node<NoteNodeData, typeof noteNodeTypeName>;

export function NoteNode({ data }: NodeProps<NoteFlowNode>) {
  return (
    <div
      className={`rounded-sm border px-2 py-2 text-sm shadow-sm ${
        data.diagnosticSeverity === "error"
          ? "border-red-500 bg-red-50 text-red-950 ring-1 ring-red-400"
          : data.diagnosticSeverity === "warning"
            ? "border-amber-600 bg-amber-50 text-amber-950 ring-1 ring-amber-400"
            : "border-amber-500 bg-amber-50 text-amber-950"
      }`}
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
