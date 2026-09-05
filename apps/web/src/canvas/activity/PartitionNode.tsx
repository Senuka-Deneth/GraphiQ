import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";

export type PartitionNodeData = {
  label: string;
  width: number;
  height: number;
  diagnosticSeverity?: "error" | "warning";
};

export const partitionNodeTypeName = "activityPartitionNode" as const;

export type PartitionFlowNode = Node<PartitionNodeData, typeof partitionNodeTypeName>;

export function PartitionNode({ data }: NodeProps<PartitionFlowNode>) {
  const diagnosticClass =
    data.diagnosticSeverity === "error"
      ? "graphiq-diagnostic-error"
      : data.diagnosticSeverity === "warning"
        ? "graphiq-diagnostic-warning"
        : undefined;

  return (
    <div
      className={`relative border border-slate-400 bg-slate-50/80 ${diagnosticClass ?? ""}`}
      style={{ width: data.width, height: data.height }}
      data-testid="partition-node"
    >
      <div
        className="border-b border-slate-400 bg-slate-100 px-2 py-1 text-center text-sm font-semibold text-slate-900"
        data-testid="partition-name"
      >
        {data.label}
      </div>
      <Handle type="target" position={Position.Top} className="!bg-slate-500" />
      <Handle type="source" position={Position.Bottom} className="!bg-slate-500" />
    </div>
  );
}
