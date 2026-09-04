import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";

export type DeploymentNodeData = {
  label: string;
  keyword?: string;
  width: number;
  height: number;
  diagnosticSeverity?: "error" | "warning";
};

export const deploymentNodeTypeName = "deploymentNode" as const;

export type DeploymentFlowNode = Node<DeploymentNodeData, typeof deploymentNodeTypeName>;

export function DeploymentNode({ data }: NodeProps<DeploymentFlowNode>) {
  const diagnosticClass =
    data.diagnosticSeverity === "error"
      ? "border-red-500 ring-1 ring-red-400"
      : data.diagnosticSeverity === "warning"
        ? "border-amber-500 ring-1 ring-amber-400"
        : "border-slate-700";
  const offset = 10;

  return (
    <div
      className="relative"
      style={{ width: data.width, height: data.height }}
      data-testid="deployment-node"
    >
      <div
        className={`absolute border bg-slate-200 ${diagnosticClass}`}
        style={{
          left: offset,
          top: 0,
          right: 0,
          height: offset,
          transform: "skewX(-45deg)",
          transformOrigin: "bottom left",
        }}
        aria-hidden="true"
      />
      <div
        className={`absolute border bg-slate-300 ${diagnosticClass}`}
        style={{
          top: offset,
          right: 0,
          width: offset,
          bottom: 0,
          transform: "skewY(-45deg)",
          transformOrigin: "top right",
        }}
        aria-hidden="true"
      />
      <div
        className={`absolute overflow-hidden border bg-white text-slate-900 ${diagnosticClass}`}
        style={{
          left: 0,
          top: offset,
          right: offset,
          bottom: 0,
        }}
      >
        {data.keyword !== undefined ? (
          <div className="px-2 pt-2 text-center text-[11px] text-slate-600">{data.keyword}</div>
        ) : null}
        <div className="px-2 text-center text-sm font-medium">{data.label}</div>
      </div>
      <Handle type="target" position={Position.Left} className="!bg-slate-500" />
      <Handle type="source" position={Position.Right} className="!bg-slate-500" />
    </div>
  );
}
