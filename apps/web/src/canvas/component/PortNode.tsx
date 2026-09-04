import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";

export type PortNodeData = {
  label: string;
  width: number;
  height: number;
  diagnosticSeverity?: "error" | "warning";
};

export const portNodeTypeName = "portNode" as const;

export type PortFlowNode = Node<PortNodeData, typeof portNodeTypeName>;

export function PortNode({ data }: NodeProps<PortFlowNode>) {
  const diagnosticClass =
    data.diagnosticSeverity === "error"
      ? "border-red-500 bg-red-100"
      : data.diagnosticSeverity === "warning"
        ? "border-amber-500 bg-amber-100"
        : "border-slate-800 bg-white";

  return (
    <div
      className={`relative border ${diagnosticClass}`}
      style={{ width: data.width, height: data.height }}
      data-testid="port-node"
      title={data.label}
    >
      <Handle type="target" position={Position.Left} className="!bg-slate-500" />
      <Handle type="source" position={Position.Right} className="!bg-slate-500" />
    </div>
  );
}
