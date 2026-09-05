import {
  NodeResizer,
  NodeToolbar,
  Position,
  type NodeProps,
  type NodeTypes,
} from "@xyflow/react";
import { DeleteIcon } from "../chrome/icons.js";
import { useDocumentStore } from "../store/documentStore.js";

type NodeSelectionChromeProps = {
  id: string;
  selected: boolean;
};

export function NodeSelectionChrome({ id, selected }: NodeSelectionChromeProps) {
  const updateNodeSize = useDocumentStore((state) => state.updateNodeSize);
  const updateNodePosition = useDocumentStore((state) => state.updateNodePosition);
  const deleteElements = useDocumentStore((state) => state.deleteElements);

  return (
    <>
      <NodeResizer
        isVisible={selected}
        minWidth={40}
        minHeight={40}
        lineClassName="graphiq-resize-line"
        handleClassName="graphiq-resize-handle"
        onResizeEnd={(_event, params) => {
          updateNodeSize(id, params.width, params.height);
          updateNodePosition(id, params.x, params.y);
        }}
      />
      <NodeToolbar
        isVisible={selected}
        position={Position.Top}
        className="nodrag nopan"
        data-testid="node-selection-toolbar"
      >
        <button
          type="button"
          className="graphiq-island-controls graphiq-icon-button"
          aria-label="Delete element"
          data-testid="delete-element"
          onClick={(event) => {
            event.stopPropagation();
            void deleteElements([id]);
          }}
        >
          <DeleteIcon />
        </button>
      </NodeToolbar>
    </>
  );
}

export function withSelectionChrome(NodeComponent: NodeTypes[string]): NodeTypes[string] {
  function Wrapped(props: NodeProps) {
    return (
      <>
        <NodeSelectionChrome id={props.id} selected={Boolean(props.selected)} />
        <NodeComponent {...props} />
      </>
    );
  }
  const name = NodeComponent.displayName ?? NodeComponent.name ?? "Node";
  Wrapped.displayName = `SelectionChrome(${name})`;
  return Wrapped;
}

export function wrapNodeTypes(nodeTypes: NodeTypes): NodeTypes {
  const wrapped: NodeTypes = {};
  for (const [key, component] of Object.entries(nodeTypes)) {
    wrapped[key] = withSelectionChrome(component);
  }
  return wrapped;
}
