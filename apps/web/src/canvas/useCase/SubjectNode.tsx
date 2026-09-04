import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";

export type SubjectNodeData = {
  label: string;
  width: number;
  height: number;
  diagnosticSeverity?: "error" | "warning";
};

export const subjectNodeTypeName = "subjectNode" as const;

export type SubjectFlowNode = Node<SubjectNodeData, typeof subjectNodeTypeName>;

export function SubjectNode({ data }: NodeProps<SubjectFlowNode>) {
  const diagnosticClass =
    data.diagnosticSeverity === "error"
      ? "graphiq-diagnostic-error"
      : data.diagnosticSeverity === "warning"
        ? "graphiq-diagnostic-warning"
        : undefined;

  return (
    <div
      className={`relative rounded border-2 border-slate-500 bg-white ${diagnosticClass ?? ""}`}
      style={{ width: data.width, height: data.height }}
      data-testid="subject-node"
    >
      <div className="border-b border-slate-400 px-2 py-1 text-center text-sm font-medium text-slate-900">
        {data.label}
      </div>
      <Handle type="target" position={Position.Left} className="!bg-slate-500" />
      <Handle type="source" position={Position.Right} className="!bg-slate-500" />
    </div>
  );
}
