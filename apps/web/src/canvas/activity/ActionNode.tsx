import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";

export type ActionNodeData = {
  label: string;
  width: number;
  height: number;
  kind: "action" | "objectNode";
  diagnosticSeverity?: "error" | "warning";
};

export const actionNodeTypeName = "activityActionNode" as const;

export type ActionFlowNode = Node<ActionNodeData, typeof actionNodeTypeName>;

export function ActionNode({ data }: NodeProps<ActionFlowNode>) {
  const diagnosticClass =
    data.diagnosticSeverity === "error"
      ? "graphiq-diagnostic-error ring-1 ring-red-400"
      : data.diagnosticSeverity === "warning"
        ? "graphiq-diagnostic-warning ring-1 ring-amber-400"
        : "";

  return (
    <div
      className={`flex items-center justify-center rounded-2xl border border-slate-800 bg-white px-3 text-center text-sm text-slate-900 ${diagnosticClass}`}
      style={{ width: data.width, height: data.height }}
      data-testid={data.kind === "objectNode" ? "object-node" : "action-node"}
    >
      <Handle type="target" position={Position.Top} className="!bg-slate-800" />
      <Handle type="source" position={Position.Bottom} className="!bg-slate-800" />
      <span data-testid={data.kind === "objectNode" ? "object-name" : "action-name"}>
        {data.label}
      </span>
    </div>
  );
}
