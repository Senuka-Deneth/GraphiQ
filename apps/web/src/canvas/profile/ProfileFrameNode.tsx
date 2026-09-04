import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";

export type ProfileFrameNodeData = {
  label: string;
  width: number;
  height: number;
  diagnosticSeverity?: "error" | "warning";
};

export const profileFrameNodeTypeName = "profileFrameNode" as const;

export type ProfileFrameFlowNode = Node<ProfileFrameNodeData, typeof profileFrameNodeTypeName>;

export function ProfileFrameNode({ data }: NodeProps<ProfileFrameFlowNode>) {
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
      data-testid="profile-frame-node"
    >
      <div className="px-2 pt-1 text-center text-[11px] text-slate-600">«profile»</div>
      <div className="px-2 text-center text-sm font-medium text-slate-900">{data.label}</div>
      <Handle type="target" position={Position.Left} className="!bg-slate-500" />
      <Handle type="source" position={Position.Right} className="!bg-slate-500" />
    </div>
  );
}
