import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { ACTOR } from "@graphiq/uml-notation";

export type ActorNodeData = {
  label: string;
  width: number;
  height: number;
  diagnosticSeverity?: "error" | "warning";
};

export const actorNodeTypeName = "actorNode" as const;

export type ActorFlowNode = Node<ActorNodeData, typeof actorNodeTypeName>;

export function ActorNode({ data }: NodeProps<ActorFlowNode>) {
  const diagnosticClass =
    data.diagnosticSeverity === "error"
      ? "graphiq-diagnostic-error"
      : data.diagnosticSeverity === "warning"
        ? "graphiq-diagnostic-warning"
        : undefined;

  return (
    <div
      className={`flex flex-col items-center ${diagnosticClass ?? ""}`}
      style={{ width: data.width, minHeight: data.height }}
      data-testid="actor-node"
    >
      <Handle type="target" position={Position.Top} className="!bg-slate-500" />
      <Handle type="source" position={Position.Bottom} className="!bg-slate-500" />
      <Handle type="target" position={Position.Left} className="!bg-slate-500" />
      <Handle type="source" position={Position.Right} className="!bg-slate-500" />

      <svg
        width={ACTOR.width}
        height={ACTOR.height}
        viewBox={`0 0 ${ACTOR.width} ${ACTOR.height}`}
        aria-hidden="true"
      >
        <circle cx={ACTOR.width / 2} cy={8} r={6} fill="none" stroke="currentColor" strokeWidth={1.5} />
        <line
          x1={ACTOR.width / 2}
          y1={14}
          x2={ACTOR.width / 2}
          y2={28}
          stroke="currentColor"
          strokeWidth={1.5}
        />
        <line
          x1={6}
          y1={20}
          x2={ACTOR.width - 6}
          y2={20}
          stroke="currentColor"
          strokeWidth={1.5}
        />
        <line
          x1={ACTOR.width / 2}
          y1={28}
          x2={8}
          y2={ACTOR.height - 2}
          stroke="currentColor"
          strokeWidth={1.5}
        />
        <line
          x1={ACTOR.width / 2}
          y1={28}
          x2={ACTOR.width - 8}
          y2={ACTOR.height - 2}
          stroke="currentColor"
          strokeWidth={1.5}
        />
      </svg>
      <div className="mt-1 text-center text-xs text-slate-900">{data.label}</div>
    </div>
  );
}
