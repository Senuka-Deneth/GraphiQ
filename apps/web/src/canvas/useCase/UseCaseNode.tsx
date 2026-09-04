import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";

export type UseCaseNodeData = {
  label: string;
  width: number;
  height: number;
  diagnosticSeverity?: "error" | "warning";
};

export const useCaseNodeTypeName = "useCaseNode" as const;

export type UseCaseFlowNode = Node<UseCaseNodeData, typeof useCaseNodeTypeName>;

export function UseCaseNode({ data }: NodeProps<UseCaseFlowNode>) {
  const diagnosticClass =
    data.diagnosticSeverity === "error"
      ? "border-red-500 bg-red-50"
      : data.diagnosticSeverity === "warning"
        ? "border-amber-500 bg-amber-50"
        : "border-slate-700 bg-white";

  return (
    <div
      className={`relative flex items-center justify-center rounded-[9999px] border px-4 py-3 text-center text-sm text-slate-900 ${diagnosticClass}`}
      style={{ width: data.width, minHeight: data.height }}
      data-testid="use-case-node"
    >
      <Handle type="target" position={Position.Top} className="!bg-slate-500" />
      <Handle type="source" position={Position.Bottom} className="!bg-slate-500" />
      <Handle type="target" position={Position.Left} className="!bg-slate-500" />
      <Handle type="source" position={Position.Right} className="!bg-slate-500" />
      {data.label}
    </div>
  );
}
