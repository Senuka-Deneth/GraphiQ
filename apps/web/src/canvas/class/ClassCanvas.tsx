import {
  Background,
  Controls,
  ReactFlow,
  ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useMemo } from "react";
import { ClassNode, classNodeTypeName } from "./ClassNode.js";
import { classCanvasFixture } from "./fixtureModel.js";
import { MarkerDefs } from "./MarkerDefs.js";
import { modelToFlow } from "./modelToFlow.js";
import { UmlEdge, umlEdgeTypeName } from "./UmlEdge.js";

const nodeTypes = {
  [classNodeTypeName]: ClassNode,
} as const;

const edgeTypes = {
  [umlEdgeTypeName]: UmlEdge,
} as const;

function ClassCanvasInner() {
  const { nodes, edges } = useMemo(
    () => modelToFlow(classCanvasFixture.model, classCanvasFixture.overlay),
    [],
  );

  return (
    <div className="h-full w-full">
      <MarkerDefs />
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        snapToGrid
        snapGrid={[8, 8]}
        minZoom={0.25}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={8} size={1} color="#cbd5e1" />
        <Controls />
      </ReactFlow>
    </div>
  );
}

export function ClassCanvas() {
  return (
    <ReactFlowProvider>
      <ClassCanvasInner />
    </ReactFlowProvider>
  );
}
