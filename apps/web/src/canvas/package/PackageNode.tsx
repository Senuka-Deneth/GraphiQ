import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";

export type PackageNodeData = {
  label: string;
  width: number;
  height: number;
  diagnosticSeverity?: "error" | "warning";
};

export const packageNodeTypeName = "packageNode" as const;

export type PackageFlowNode = Node<PackageNodeData, typeof packageNodeTypeName>;

export function PackageNode({ data }: NodeProps<PackageFlowNode>) {
  const diagnosticClass =
    data.diagnosticSeverity === "error"
      ? "graphiq-diagnostic-error"
      : data.diagnosticSeverity === "warning"
        ? "graphiq-diagnostic-warning"
        : undefined;

  return (
    <div
      className={`relative rounded border border-slate-400 bg-slate-50 ${diagnosticClass ?? ""}`}
      style={{ width: data.width, height: data.height }}
      data-testid="package-node"
    >
      <div className="absolute -top-px left-0 rounded-t border border-b-0 border-slate-400 bg-slate-50 px-3 py-1 text-sm font-medium text-slate-900">
        {data.label}
      </div>
      <Handle type="target" position={Position.Left} className="!bg-slate-500" />
      <Handle type="source" position={Position.Right} className="!bg-slate-500" />
    </div>
  );
}
