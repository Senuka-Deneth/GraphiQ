import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";

export type StateNodeData = {
  label: string;
  width: number;
  height: number;
  entry?: string;
  do?: string;
  exit?: string;
  isComposite: boolean;
  diagnosticSeverity?: "error" | "warning";
};

export const stateNodeTypeName = "stateMachineStateNode" as const;

export type StateFlowNode = Node<StateNodeData, typeof stateNodeTypeName>;

export function StateNode({ data }: NodeProps<StateFlowNode>) {
  const diagnosticClass =
    data.diagnosticSeverity === "error"
      ? "graphiq-diagnostic-error ring-1 ring-red-400"
      : data.diagnosticSeverity === "warning"
        ? "graphiq-diagnostic-warning ring-1 ring-amber-400"
        : "";

  if (data.isComposite) {
    return (
      <div
        className={`relative rounded-lg border-2 border-slate-700 bg-white ${diagnosticClass}`}
        style={{ width: data.width, height: data.height }}
        data-testid="state-node"
      >
        <div
          className="border-b border-slate-400 bg-slate-100 px-2 py-1 text-center text-sm font-semibold text-slate-900"
          data-testid="state-name"
        >
          {data.label}
        </div>
        <Handle type="target" position={Position.Top} className="!bg-slate-800" />
        <Handle type="source" position={Position.Bottom} className="!bg-slate-800" />
      </div>
    );
  }

  const rows: { prefix: string; text: string }[] = [];
  if (data.entry !== undefined) {
    rows.push({ prefix: "entry", text: data.entry });
  }
  if (data.do !== undefined) {
    rows.push({ prefix: "do", text: data.do });
  }
  if (data.exit !== undefined) {
    rows.push({ prefix: "exit", text: data.exit });
  }

  return (
    <div
      className={`flex flex-col overflow-hidden rounded-2xl border border-slate-800 bg-white text-sm text-slate-900 ${diagnosticClass}`}
      style={{ width: data.width, height: data.height }}
      data-testid="state-node"
    >
      <Handle type="target" position={Position.Top} className="!bg-slate-800" />
      <Handle type="source" position={Position.Bottom} className="!bg-slate-800" />
      <div
        className="flex min-h-8 items-center justify-center px-3 py-1 text-center font-medium"
        data-testid="state-name"
      >
        {data.label}
      </div>
      {rows.map((row) => (
        <div
          key={row.prefix}
          className="border-t border-slate-300 px-2 py-0.5 text-xs text-slate-700"
        >
          {row.prefix} / {row.text}
        </div>
      ))}
    </div>
  );
}
