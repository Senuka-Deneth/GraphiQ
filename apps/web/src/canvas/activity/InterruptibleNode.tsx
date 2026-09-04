import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";

export type InterruptibleNodeData = {
  label: string;
  width: number;
  height: number;
  diagnosticSeverity?: "error" | "warning";
};

export const interruptibleNodeTypeName = "activityInterruptibleNode" as const;

export type InterruptibleFlowNode = Node<InterruptibleNodeData, typeof interruptibleNodeTypeName>;

export function InterruptibleNode({ data }: NodeProps<InterruptibleFlowNode>) {
  return (
    <div
      className="rounded border border-dashed border-slate-500 bg-transparent"
      style={{ width: data.width, height: data.height }}
      data-testid="interruptible-node"
    >
      <div className="px-2 py-0.5 text-xs text-slate-600">{data.label}</div>
      <Handle type="target" position={Position.Top} className="!bg-slate-500" />
      <Handle type="source" position={Position.Bottom} className="!bg-slate-500" />
    </div>
  );
}
