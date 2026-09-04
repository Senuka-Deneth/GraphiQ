import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";

export type PartNodeData = {
  label: string;
  typeName: string;
  multiplicity?: string;
  width: number;
  height: number;
  diagnosticSeverity?: "error" | "warning";
};

export const partNodeTypeName = "csPartNode" as const;

export type PartFlowNode = Node<PartNodeData, typeof partNodeTypeName>;

export function PartNode({ data }: NodeProps<PartFlowNode>) {
  const diagnosticClass =
    data.diagnosticSeverity === "error"
      ? "border-red-500 ring-1 ring-red-400"
      : data.diagnosticSeverity === "warning"
        ? "border-amber-500 ring-1 ring-amber-400"
        : "border-slate-700";

  const multiplicity =
    data.multiplicity !== undefined && data.multiplicity.length > 0
      ? ` [${data.multiplicity}]`
      : "";

  return (
    <div
      className={`relative rounded-sm border bg-slate-50 text-slate-900 shadow-sm ${diagnosticClass}`}
      style={{ width: data.width, height: data.height }}
      data-testid="cs-part-node"
    >
      <Handle type="target" position={Position.Left} className="!bg-slate-500" />
      <Handle type="source" position={Position.Right} className="!bg-slate-500" />
      <div className="flex h-full items-center justify-center px-2 text-center text-sm">
        <span>
          {data.label}: {data.typeName}
          {multiplicity}
        </span>
      </div>
    </div>
  );
}
