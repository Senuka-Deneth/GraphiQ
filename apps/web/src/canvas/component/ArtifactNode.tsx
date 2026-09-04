import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";

export type ArtifactNodeData = {
  label: string;
  width: number;
  height: number;
  diagnosticSeverity?: "error" | "warning";
};

export const artifactNodeTypeName = "artifactNode" as const;

export type ArtifactFlowNode = Node<ArtifactNodeData, typeof artifactNodeTypeName>;

export function ArtifactNode({ data }: NodeProps<ArtifactFlowNode>) {
  const diagnosticClass =
    data.diagnosticSeverity === "error"
      ? "border-red-500 ring-1 ring-red-400"
      : data.diagnosticSeverity === "warning"
        ? "border-amber-500 ring-1 ring-amber-400"
        : "border-slate-700";

  return (
    <div
      className={`relative overflow-hidden border bg-white text-slate-900 shadow-sm ${diagnosticClass}`}
      style={{ width: data.width, height: data.height }}
      data-testid="artifact-node"
    >
      <div
        className="absolute top-0 right-0 h-4 w-4 border-b border-l border-slate-700 bg-slate-100"
        aria-hidden="true"
      />
      <Handle type="target" position={Position.Left} className="!bg-slate-500" />
      <Handle type="source" position={Position.Right} className="!bg-slate-500" />
      <div className="px-2 pt-3 text-center text-[11px] text-slate-600">«artifact»</div>
      <div className="px-2 text-center text-sm font-medium">{data.label}</div>
    </div>
  );
}
