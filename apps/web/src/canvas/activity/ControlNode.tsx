import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";

export type ControlNodeKind =
  | "initialNode"
  | "activityFinalNode"
  | "flowFinalNode"
  | "decisionNode"
  | "mergeNode"
  | "forkNode"
  | "joinNode";

export type ControlNodeData = {
  label: string;
  width: number;
  height: number;
  kind: ControlNodeKind;
  diagnosticSeverity?: "error" | "warning";
};

export const controlNodeTypeName = "activityControlNode" as const;

export type ControlFlowNode = Node<ControlNodeData, typeof controlNodeTypeName>;

function ControlShape({ data }: { data: ControlNodeData }) {
  const stroke = data.diagnosticSeverity === "error" ? "#dc2626" : "#0f172a";

  switch (data.kind) {
    case "initialNode":
      return (
        <svg width={data.width} height={data.height} viewBox="0 0 20 20" aria-hidden="true">
          <circle cx="10" cy="10" r="8" fill={stroke} />
        </svg>
      );
    case "activityFinalNode":
      return (
        <svg width={data.width} height={data.height} viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="10" fill="none" stroke={stroke} strokeWidth="2" />
          <circle cx="12" cy="12" r="6" fill={stroke} />
        </svg>
      );
    case "flowFinalNode":
      return (
        <svg width={data.width} height={data.height} viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="10" fill="none" stroke={stroke} strokeWidth="2" />
          <path d="M7 7 L17 17 M17 7 L7 17" stroke={stroke} strokeWidth="2" />
        </svg>
      );
    case "decisionNode":
    case "mergeNode":
      return (
        <svg width={data.width} height={data.height} viewBox="0 0 36 36" aria-hidden="true">
          <path d="M18 2 L34 18 L18 34 L2 18 Z" fill="white" stroke={stroke} strokeWidth="2" />
        </svg>
      );
    case "forkNode":
    case "joinNode":
      return (
        <div
          className="rounded-sm"
          style={{ width: data.width, height: data.height, backgroundColor: stroke }}
        />
      );
    default: {
      const unreachable: never = data.kind;
      throw new Error(`Unhandled control node: ${String(unreachable)}`);
    }
  }
}

export function ControlNode({ data }: NodeProps<ControlFlowNode>) {
  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: data.width, height: data.height }}
      data-testid={`control-${data.kind}`}
    >
      <Handle type="target" position={Position.Top} className="!bg-slate-800" />
      <Handle type="source" position={Position.Bottom} className="!bg-slate-800" />
      <ControlShape data={data} />
    </div>
  );
}
