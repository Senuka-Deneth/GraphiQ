import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";

export type RegionNodeData = {
  label: string;
  width: number;
  height: number;
  showLabel: boolean;
  diagnosticSeverity?: "error" | "warning";
};

export const regionNodeTypeName = "stateMachineRegionNode" as const;

export type RegionFlowNode = Node<RegionNodeData, typeof regionNodeTypeName>;

export function RegionNode({ data }: NodeProps<RegionFlowNode>) {
  const diagnosticClass =
    data.diagnosticSeverity === "error"
      ? "graphiq-diagnostic-error"
      : data.diagnosticSeverity === "warning"
        ? "graphiq-diagnostic-warning"
        : undefined;

  return (
    <div
      className={`relative border border-dashed border-slate-400 bg-slate-50/50 ${diagnosticClass ?? ""}`}
      style={{ width: data.width, height: data.height }}
      data-testid="region-node"
    >
      {data.showLabel ? (
        <div
          className="absolute left-1 top-0 -translate-y-1/2 bg-white px-1 text-[10px] font-medium uppercase tracking-wide text-slate-500"
          data-testid="region-name"
        >
          {data.label}
        </div>
      ) : null}
      <Handle type="target" position={Position.Top} className="!bg-slate-500" />
      <Handle type="source" position={Position.Bottom} className="!bg-slate-500" />
    </div>
  );
}
