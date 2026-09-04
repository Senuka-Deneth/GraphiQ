import { CLASS_BOX } from "@graphiq/uml-notation";
import type { Slot } from "@graphiq/uml-model";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";

export type InstanceNodeData = {
  instanceName: string;
  classifierName: string;
  slots: readonly Slot[];
  width: number;
  height: number;
  diagnosticSeverity?: "error" | "warning";
};

export const instanceNodeTypeName = "instanceNode" as const;

export type InstanceFlowNode = Node<InstanceNodeData, typeof instanceNodeTypeName>;

function formatSlot(slot: Slot): string {
  return `${slot.featureName} = ${slot.value}`;
}

export function InstanceNode({ data }: NodeProps<InstanceFlowNode>) {
  return (
    <div
      className={`overflow-hidden rounded-sm border bg-white text-slate-900 shadow-sm ${
        data.diagnosticSeverity === "error"
          ? "border-red-500 ring-1 ring-red-400"
          : data.diagnosticSeverity === "warning"
            ? "border-amber-500 ring-1 ring-amber-400"
            : "border-slate-700"
      }`}
      style={{
        width: data.width,
        minHeight: data.height,
        fontFamily: CLASS_BOX.fontFamily,
      }}
    >
      <Handle type="target" position={Position.Top} className="!bg-slate-500" />
      <Handle type="source" position={Position.Bottom} className="!bg-slate-500" />
      <Handle type="target" position={Position.Left} className="!bg-slate-500" />
      <Handle type="source" position={Position.Right} className="!bg-slate-500" />

      <div
        className="border-b border-slate-700 px-2 py-1 text-center underline"
        data-testid="instance-name"
        style={{
          minHeight: CLASS_BOX.nameCompartmentHeight,
          fontSize: CLASS_BOX.nameFontSizePx,
          fontWeight: CLASS_BOX.nameFontWeight,
        }}
      >
        {data.instanceName}: {data.classifierName}
      </div>

      {data.slots.length > 0 ? (
        <div className="px-2 py-1" style={{ fontSize: CLASS_BOX.bodyFontSizePx }}>
          {data.slots.map((slot) => (
            <div key={slot.featureName} style={{ lineHeight: `${CLASS_BOX.rowHeight}px` }}>
              {formatSlot(slot)}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
