import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";

export type ComponentNodeData = {
  label: string;
  width: number;
  height: number;
  diagnosticSeverity?: "error" | "warning";
};

export const componentNodeTypeName = "componentNode" as const;

export type ComponentFlowNode = Node<ComponentNodeData, typeof componentNodeTypeName>;

export function ComponentNode({ data }: NodeProps<ComponentFlowNode>) {
  const diagnosticClass =
    data.diagnosticSeverity === "error"
      ? "border-red-500 ring-1 ring-red-400"
      : data.diagnosticSeverity === "warning"
        ? "border-amber-500 ring-1 ring-amber-400"
        : "border-slate-700";

  return (
    <div
      className={`relative rounded-sm border bg-white text-slate-900 shadow-sm ${diagnosticClass}`}
      style={{ width: data.width, height: data.height }}
      data-testid="component-node"
    >
      <div className="absolute top-2 -left-1.5 flex flex-col gap-0.5" aria-hidden="true">
        <span className="h-2.5 w-3 rounded-[1px] border border-slate-700 bg-white" />
        <span className="h-2.5 w-3 rounded-[1px] border border-slate-700 bg-white" />
      </div>
      <Handle type="target" position={Position.Left} className="!bg-slate-500" />
      <Handle type="source" position={Position.Right} className="!bg-slate-500" />
      <Handle type="target" position={Position.Top} className="!bg-slate-500" />
      <Handle type="source" position={Position.Bottom} className="!bg-slate-500" />
      <div className="px-4 pt-2 text-center text-[11px] text-slate-600">«component»</div>
      <div className="px-4 text-center text-sm font-semibold">{data.label}</div>
    </div>
  );
}
