import { useCallback, useMemo, useRef, useState } from "react";
import { MarkerDefs } from "../class/MarkerDefs.js";
import { useDocumentStore } from "../../store/documentStore.js";
import {
  dashStrokeStyle,
  lifelineDisplayName,
  lifelineHeadHeight,
  sequenceModelToSvg,
  strokeForDiagnostic,
} from "./modelToSvg.js";

export function SequenceCanvas() {
  const model = useDocumentStore((state) => state.document.model);
  const overlay = useDocumentStore((state) => state.document.overlay);
  const diagnostics = useDocumentStore((state) => state.diagnostics);
  const updateNodePosition = useDocumentStore((state) => state.updateNodePosition);
  const connectElements = useDocumentStore((state) => state.connectElements);
  const dropStencilElement = useDocumentStore((state) => state.dropStencilElement);
  const deleteElements = useDocumentStore((state) => state.deleteElements);

  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedLifelineId, setSelectedLifelineId] = useState<string | null>(null);
  const [dragState, setDragState] = useState<{
    lifelineId: string;
    offsetX: number;
    offsetY: number;
  } | null>(null);

  const renderable = useMemo(
    () => sequenceModelToSvg(model, overlay, diagnostics),
    [model, overlay, diagnostics],
  );

  const clientToSvg = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) {
      return { x: clientX, y: clientY };
    }
    const point = svg.createSVGPoint();
    point.x = clientX;
    point.y = clientY;
    const matrix = svg.getScreenCTM()?.inverse();
    if (!matrix) {
      return { x: clientX, y: clientY };
    }
    const transformed = point.matrixTransform(matrix);
    return { x: transformed.x, y: transformed.y };
  }, []);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const kind = event.dataTransfer.getData("application/graphiq-stencil");
      if (!kind) {
        return;
      }
      const point = clientToSvg(event.clientX, event.clientY);
      void dropStencilElement(kind as "lifeline" | "combined-fragment" | "note", point.x, point.y);
    },
    [clientToSvg, dropStencilElement],
  );

  const onLifelinePointerDown = useCallback(
    (lifelineId: string, event: React.PointerEvent<SVGGElement>) => {
      event.stopPropagation();
      const lifeline = renderable.lifelines.find((item) => item.id === lifelineId);
      if (!lifeline) {
        return;
      }
      const point = clientToSvg(event.clientX, event.clientY);
      setSelectedLifelineId(lifelineId);
      setDragState({
        lifelineId,
        offsetX: point.x - lifeline.x,
        offsetY: point.y - lifeline.y,
      });
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [clientToSvg, renderable.lifelines],
  );

  const onCanvasPointerMove = useCallback(
    (event: React.PointerEvent<SVGSVGElement>) => {
      if (dragState === null) {
        return;
      }
      const point = clientToSvg(event.clientX, event.clientY);
      updateNodePosition(
        dragState.lifelineId,
        Math.max(0, point.x - dragState.offsetX),
        Math.max(0, point.y - dragState.offsetY),
      );
    },
    [clientToSvg, dragState, updateNodePosition],
  );

  const onCanvasPointerUp = useCallback(() => {
    setDragState(null);
  }, []);

  const onLifelineClick = useCallback(
    (lifelineId: string, event: React.MouseEvent) => {
      event.stopPropagation();
      if (selectedLifelineId !== null && selectedLifelineId !== lifelineId) {
        void connectElements(selectedLifelineId, lifelineId);
        setSelectedLifelineId(null);
        return;
      }
      setSelectedLifelineId(lifelineId);
    },
    [connectElements, selectedLifelineId],
  );

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key !== "Backspace" && event.key !== "Delete") {
        return;
      }
      if (selectedLifelineId === null) {
        return;
      }
      void deleteElements([selectedLifelineId]);
      setSelectedLifelineId(null);
    },
    [deleteElements, selectedLifelineId],
  );

  const headHeight = lifelineHeadHeight();

  return (
    <div
      className="relative h-full w-full overflow-auto bg-slate-50"
      data-testid="sequence-canvas"
      onDragOver={onDragOver}
      onDrop={onDrop}
      tabIndex={0}
      onKeyDown={onKeyDown}
    >
      <MarkerDefs />
      <svg
        ref={svgRef}
        className="min-h-full min-w-full"
        width={renderable.width}
        height={renderable.height}
        onPointerMove={onCanvasPointerMove}
        onPointerUp={onCanvasPointerUp}
        onPointerLeave={onCanvasPointerUp}
        onClick={() => setSelectedLifelineId(null)}
      >
        {renderable.combinedFragments.map((fragment) => (
          <g key={fragment.id} data-testid="combined-fragment">
            <rect
              x={fragment.x}
              y={fragment.y}
              width={fragment.width}
              height={fragment.height}
              fill="rgba(255,255,255,0.6)"
              stroke={strokeForDiagnostic(fragment.diagnosticSeverity) ?? "#64748b"}
              strokeDasharray="6 4"
            />
            <text
              x={fragment.x + 8}
              y={fragment.y + 16}
              className="fill-slate-700 text-xs font-semibold"
            >
              {fragment.operator}
            </text>
          </g>
        ))}

        {renderable.lifelines.map((lifeline) => (
          <g
            key={lifeline.id}
            data-testid="lifeline-head"
            onPointerDown={(event) => onLifelinePointerDown(lifeline.id, event)}
            onClick={(event) => onLifelineClick(lifeline.id, event)}
          >
            <line
              x1={lifeline.centerX}
              y1={lifeline.y + headHeight}
              x2={lifeline.centerX}
              y2={lifeline.y + lifeline.height}
              stroke={strokeForDiagnostic(lifeline.diagnosticSeverity) ?? "#64748b"}
              strokeDasharray="6 4"
              strokeWidth={1}
            />
            <rect
              x={lifeline.x}
              y={lifeline.y}
              width={lifeline.width}
              height={headHeight}
              fill="#ffffff"
              stroke={
                selectedLifelineId === lifeline.id
                  ? "#0f172a"
                  : strokeForDiagnostic(lifeline.diagnosticSeverity) ?? "#334155"
              }
              strokeWidth={selectedLifelineId === lifeline.id ? 2 : 1}
              rx={2}
            />
            <text
              x={lifeline.x + lifeline.width / 2}
              y={lifeline.y + headHeight / 2 + 4}
              textAnchor="middle"
              data-testid="lifeline-name"
              className="fill-slate-900 text-xs"
            >
              {lifelineDisplayName(lifeline)}
            </text>
          </g>
        ))}

        {renderable.executionSpecs.map((execution) => (
          <rect
            key={execution.id}
            data-testid="execution-spec"
            x={execution.x}
            y={execution.y}
            width={execution.width}
            height={execution.height}
            fill="#e2e8f0"
            stroke={strokeForDiagnostic(execution.diagnosticSeverity) ?? "#94a3b8"}
            strokeWidth={1}
          />
        ))}

        {renderable.messages.map((message) => {
          const stroke = strokeForDiagnostic(message.diagnosticSeverity) ?? "#0f172a";
          const dashProps = message.lineStyle === "dash" ? dashStrokeStyle : {};
          return (
            <g key={message.id} data-testid="sequence-message" data-marker-id={message.markerId}>
              <line
                x1={message.x1}
                y1={message.y}
                x2={message.x2}
                y2={message.y}
                stroke={stroke}
                strokeWidth={1.5}
                markerEnd={`url(#${message.markerId})`}
                {...dashProps}
              />
              {message.label !== undefined ? (
                <text
                  x={(message.x1 + message.x2) / 2}
                  y={message.y - 6}
                  textAnchor="middle"
                  className="fill-slate-700 text-xs"
                >
                  {message.label}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
