import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";

export type InterfaceLollipopRole = "provided" | "required";

export type InterfaceLollipopNodeData = {
  label: string;
  role: InterfaceLollipopRole;
  width: number;
  height: number;
  diagnosticSeverity?: "error" | "warning";
};

export const interfaceLollipopNodeTypeName = "interfaceLollipopNode" as const;

export type InterfaceLollipopFlowNode = Node<
  InterfaceLollipopNodeData,
  typeof interfaceLollipopNodeTypeName
>;

export function InterfaceLollipopNode({ data }: NodeProps<InterfaceLollipopFlowNode>) {
  const diagnosticClass =
    data.diagnosticSeverity === "error"
      ? "text-red-600"
      : data.diagnosticSeverity === "warning"
        ? "text-amber-600"
        : "text-slate-800";

  const provided = data.role === "provided";
  const symbolX = provided ? 12 : data.width - 12;
  return (
    <div className={`relative ${diagnosticClass}`} style={{ width: data.width, height: data.height }}
      data-testid="interface-lollipop" data-interface-role={data.role}>
      <Handle type="target" position={provided ? Position.Left : Position.Right}
        style={{ left: symbolX, top: 32, transform: "translate(-50%, -50%)" }} />
      <Handle type="source" position={provided ? Position.Left : Position.Right}
        style={{ left: symbolX, top: 32, transform: "translate(-50%, -50%)" }} />
      <svg width={data.width} height={data.height} className="absolute inset-0 overflow-visible" aria-hidden="true">
        <path d={provided ? `M 20 32 H ${data.width}` : `M 0 32 H ${symbolX - 9}`}
          fill="none" stroke="currentColor" strokeWidth="1.5" />
        {provided ? <circle cx={symbolX} cy="32" r="8" fill="white" stroke="currentColor" strokeWidth="1.5" />
          : <path d={`M ${symbolX + 1} 22 A 10 10 0 0 0 ${symbolX + 1} 42`}
              fill="none" stroke="currentColor" strokeWidth="1.5" />}
      </svg>
      <span className="absolute inset-x-1 top-0 text-center text-xs whitespace-nowrap">{data.label}</span>
    </div>
  );
}
