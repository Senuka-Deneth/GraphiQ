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

  return (
    <div
      className={`flex items-center gap-1 ${diagnosticClass}`}
      style={{ width: data.width, height: data.height }}
      data-testid="interface-lollipop"
      data-interface-role={data.role}
    >
      <Handle type="target" position={Position.Left} className="!bg-slate-500" />
      <Handle type="source" position={Position.Right} className="!bg-slate-500" />
      {data.role === "provided" ? (
        <span
          className="inline-block h-3.5 w-3.5 shrink-0 rounded-full border-2 border-slate-800 bg-white"
          aria-hidden="true"
        />
      ) : (
        <span
          className="inline-block h-4 w-3 shrink-0 rounded-r-full border-2 border-l-0 border-slate-800 bg-transparent"
          aria-hidden="true"
        />
      )}
      <span className="truncate text-xs">{data.label}</span>
    </div>
  );
}
