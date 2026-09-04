import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import type { PseudostateKind } from "@graphiq/uml-model";

export type VertexNodeKind = PseudostateKind | "finalState";

export type VertexNodeData = {
  label: string;
  width: number;
  height: number;
  kind: VertexNodeKind;
  diagnosticSeverity?: "error" | "warning";
};

export const vertexNodeTypeName = "stateMachineVertexNode" as const;

export type VertexFlowNode = Node<VertexNodeData, typeof vertexNodeTypeName>;

function VertexShape({ data }: { data: VertexNodeData }) {
  const stroke = data.diagnosticSeverity === "error" ? "#dc2626" : "#0f172a";

  switch (data.kind) {
    case "initial":
      return (
        <svg width={data.width} height={data.height} viewBox="0 0 20 20" aria-hidden="true">
          <circle cx="10" cy="10" r="8" fill={stroke} />
        </svg>
      );
    case "finalState":
      return (
        <svg width={data.width} height={data.height} viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="10" fill="none" stroke={stroke} strokeWidth="2" />
          <circle cx="12" cy="12" r="6" fill={stroke} />
        </svg>
      );
    case "choice":
    case "junction":
      return (
        <svg width={data.width} height={data.height} viewBox="0 0 36 36" aria-hidden="true">
          <path d="M18 2 L34 18 L18 34 L2 18 Z" fill="white" stroke={stroke} strokeWidth="2" />
        </svg>
      );
    case "fork":
    case "join":
      return (
        <div
          className="rounded-sm"
          style={{ width: data.width, height: data.height, backgroundColor: stroke }}
        />
      );
    case "shallowHistory":
      return (
        <svg width={data.width} height={data.height} viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="10" fill="white" stroke={stroke} strokeWidth="2" />
          <text x="12" y="16" textAnchor="middle" fontSize="11" fill={stroke} fontWeight="600">
            H
          </text>
        </svg>
      );
    case "deepHistory":
      return (
        <svg width={data.width} height={data.height} viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="10" fill="white" stroke={stroke} strokeWidth="2" />
          <text x="12" y="16" textAnchor="middle" fontSize="10" fill={stroke} fontWeight="600">
            H*
          </text>
        </svg>
      );
    case "terminate":
      return (
        <svg width={data.width} height={data.height} viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 6 L18 18 M18 6 L6 18" stroke={stroke} strokeWidth="2.5" />
        </svg>
      );
    case "entryPoint":
    case "exitPoint":
      return (
        <svg width={data.width} height={data.height} viewBox="0 0 20 20" aria-hidden="true">
          <circle cx="10" cy="10" r="8" fill="white" stroke={stroke} strokeWidth="2" />
        </svg>
      );
    default: {
      const unreachable: never = data.kind;
      throw new Error(`Unhandled vertex kind: ${String(unreachable)}`);
    }
  }
}

export function VertexNode({ data }: NodeProps<VertexFlowNode>) {
  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: data.width, height: data.height }}
      data-testid={`vertex-${data.kind}`}
    >
      <Handle type="target" position={Position.Top} className="!bg-slate-800" />
      <Handle type="source" position={Position.Bottom} className="!bg-slate-800" />
      <VertexShape data={data} />
    </div>
  );
}
