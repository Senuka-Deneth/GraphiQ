import { CLASS_BOX, DASH_ARRAY } from "@graphiq/uml-notation";
import type { Attribute, Operation, Visibility } from "@graphiq/uml-model";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";

export type ClassNodeData = {
  label: string;
  keyword?: string;
  isAbstract?: boolean;
  attributes: readonly Attribute[];
  operations: readonly Operation[];
  literals?: readonly string[];
  width: number;
  height: number;
};

export const classNodeTypeName = "classNode" as const;

function visibilitySymbol(visibility: Visibility): string {
  switch (visibility) {
    case "public":
      return "+";
    case "private":
      return "-";
    case "protected":
      return "#";
    case "package":
      return "~";
    default:
      return "+";
  }
}

function formatAttribute(attribute: Attribute): string {
  const base = `${visibilitySymbol(attribute.visibility)}${attribute.name}: ${attribute.typeName}`;
  if (attribute.multiplicity !== undefined) {
    return `${base} [${attribute.multiplicity}]`;
  }
  return base;
}

function formatOperation(operation: Operation): string {
  const params = operation.parameters
    .map((parameter) => `${parameter.name}: ${parameter.typeName}`)
    .join(", ");
  const signature = `${visibilitySymbol(operation.visibility)}${operation.name}(${params})`;
  return operation.returnType !== undefined ? `${signature}: ${operation.returnType}` : signature;
}

export type ClassFlowNode = Node<ClassNodeData, typeof classNodeTypeName>;

export function ClassNode({ data }: NodeProps<ClassFlowNode>) {
  const middleLines =
    data.literals !== undefined
      ? data.literals
      : data.attributes.map((attribute) => formatAttribute(attribute));
  const bottomLines = data.literals !== undefined ? [] : data.operations.map(formatOperation);

  return (
    <div
      className="overflow-hidden rounded-sm border border-slate-700 bg-white text-slate-900 shadow-sm"
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
        className="border-b border-slate-700 px-2 py-1 text-center"
        style={{
          minHeight: CLASS_BOX.nameCompartmentHeight,
          fontSize: CLASS_BOX.nameFontSizePx,
          fontWeight: CLASS_BOX.nameFontWeight,
          fontStyle: data.isAbstract ? "italic" : "normal",
        }}
      >
        {data.keyword !== undefined ? (
          <div
            className="text-[11px] font-normal not-italic text-slate-600"
            style={{ lineHeight: `${CLASS_BOX.rowHeight}px` }}
          >
            {data.keyword}
          </div>
        ) : null}
        <div>{data.label}</div>
      </div>

      {middleLines.length > 0 ? (
        <div className="border-b border-slate-700 px-2 py-1" style={{ fontSize: CLASS_BOX.bodyFontSizePx }}>
          {middleLines.map((line) => (
            <div key={line} style={{ lineHeight: `${CLASS_BOX.rowHeight}px` }}>
              {line}
            </div>
          ))}
        </div>
      ) : null}

      {bottomLines.length > 0 ? (
        <div className="px-2 py-1" style={{ fontSize: CLASS_BOX.bodyFontSizePx }}>
          {bottomLines.map((line) => (
            <div key={line} style={{ lineHeight: `${CLASS_BOX.rowHeight}px` }}>
              {line}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export const dashStrokeStyle = {
  strokeDasharray: DASH_ARRAY,
} as const;
