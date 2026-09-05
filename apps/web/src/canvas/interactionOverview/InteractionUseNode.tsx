import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";

export type InteractionUseNodeData = {
  label: string;
  width: number;
  height: number;
  diagnosticSeverity?: "error" | "warning";
};

export const interactionUseNodeTypeName = "interactionUseNode" as const;

export type InteractionUseFlowNode = Node<
  InteractionUseNodeData,
  typeof interactionUseNodeTypeName
>;

export function InteractionUseNode({ data }: NodeProps<InteractionUseFlowNode>) {
  const stroke =
    data.diagnosticSeverity === "error"
      ? "#dc2626"
      : data.diagnosticSeverity === "warning"
        ? "#d97706"
        : "#0f172a";

  return (
    <div
      className="relative bg-white"
      style={{ width: data.width, height: data.height }}
      data-testid="interaction-use-frame"
    >
      <Handle type="target" position={Position.Top} className="!bg-slate-800" />
      <Handle type="source" position={Position.Bottom} className="!bg-slate-800" />
      <svg
        width={data.width}
        height={data.height}
        viewBox={`0 0 ${data.width} ${data.height}`}
        aria-hidden="true"
        className="absolute inset-0"
      >
        <rect
          x="0.5"
          y="0.5"
          width={data.width - 1}
          height={data.height - 1}
          fill="white"
          stroke={stroke}
          strokeWidth="1"
        />
        <path
          d="M 0.5 0.5 H 44 L 54 16 H 0.5 Z"
          fill="white"
          stroke={stroke}
          strokeWidth="1"
        />
      </svg>
      <span className="absolute left-2 top-0.5 text-[10px] font-medium leading-4 text-slate-700">
        ref
      </span>
      <div className="flex h-full items-center justify-center px-2 pt-3">
        <span
          className="truncate text-sm text-slate-900"
          data-testid="interaction-use-name"
        >
          {data.label}
        </span>
      </div>
    </div>
  );
}
