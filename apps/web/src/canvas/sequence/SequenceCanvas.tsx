import { useCallback, useMemo, useRef, useState } from "react";
import { MarkerDefs } from "../class/MarkerDefs.js";
import { SvgSquareGrid, SvgZoomViewport } from "../SvgZoomViewport.js";
import { DEFAULT_STROKE_WIDTH } from "../canvasDefaults.js";
import { useDocumentStore, type StencilDropKind } from "../../store/documentStore.js";
import {
  dashStrokeStyle,
  lifelineDisplayName,
  lifelineHeadHeight,
  sequenceModelToSvg,
  strokeForDiagnostic,
} from "./modelToSvg.js";

export function SequenceCanvas({
  onSelectedNodeChange,
  onSelectedEdgeChange,
}: {
  onSelectedNodeChange?: (nodeId: string | null) => void;
  onSelectedEdgeChange?: (edgeId: string | null) => void;
}) {
  const model = useDocumentStore((state) => state.document.model);
  const overlay = useDocumentStore((state) => state.document.overlay);
  const diagnostics = useDocumentStore((state) => state.diagnostics);
  const updateNodePosition = useDocumentStore((state) => state.updateNodePosition);
  const connectElements = useDocumentStore((state) => state.connectElements);
  const dropStencilElement = useDocumentStore((state) => state.dropStencilElement);
  const deleteElements = useDocumentStore((state) => state.deleteElements);
  const renameSelectedElement = useDocumentStore((state) => state.renameSelectedElement);

  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedLifelineId, setSelectedLifelineId] = useState<string | null>(null);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
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
      const kind = event.dataTransfer.getData("application/graphiq-stencil") as StencilDropKind;
      if (!kind) {
        return;
      }
      const point = clientToSvg(event.clientX, event.clientY);
      void dropStencilElement(kind, point.x, point.y);
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
      onSelectedNodeChange?.(lifelineId);
      onSelectedEdgeChange?.(null);
      setSelectedMessageId(null);
      setDragState({
        lifelineId,
        offsetX: point.x - lifeline.x,
        offsetY: point.y - lifeline.y,
      });
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [clientToSvg, onSelectedEdgeChange, onSelectedNodeChange, renderable.lifelines],
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

  const onElementClick = useCallback(
    (elementId: string, event: React.MouseEvent) => {
      event.stopPropagation();
      if (selectedLifelineId !== null && selectedLifelineId !== elementId) {
        void connectElements(selectedLifelineId, elementId);
        setSelectedLifelineId(null);
        onSelectedNodeChange?.(null);
        onSelectedEdgeChange?.(null);
        return;
      }
      setSelectedLifelineId(elementId);
      onSelectedNodeChange?.(elementId);
      onSelectedEdgeChange?.(null);
      setSelectedMessageId(null);
    },
    [connectElements, onSelectedEdgeChange, onSelectedNodeChange, selectedLifelineId],
  );

  const noteElements = useMemo(
    () =>
      model.elements.flatMap((element) => {
        if (element.elementType !== "note") {
          return [];
        }
        const node = overlay.nodes[element.id];
        if (node === undefined) {
          return [];
        }
        return [{ element, node }];
      }),
    [model.elements, overlay.nodes],
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

  const onPaneDoubleClick = useCallback(
    async (event: React.MouseEvent<SVGSVGElement>) => {
      if (event.target !== event.currentTarget) {
        return;
      }
      const point = clientToSvg(event.clientX, event.clientY);
      await dropStencilElement("text", point.x, point.y);
      const last = useDocumentStore.getState().document.model.elements.at(-1);
      if (last?.elementType !== "note") {
        return;
      }
      const nextName = window.prompt("Text", last.name);
      if (nextName !== null && nextName.trim().length > 0) {
        await renameSelectedElement(last.id, nextName.trim());
      }
    },
    [clientToSvg, dropStencilElement, renameSelectedElement],
  );

  const onMessageClick = useCallback(
    (messageId: string, event: React.MouseEvent) => {
      event.stopPropagation();
      setSelectedMessageId(messageId);
      setSelectedLifelineId(null);
      onSelectedNodeChange?.(null);
      onSelectedEdgeChange?.(messageId);
    },
    [onSelectedEdgeChange, onSelectedNodeChange],
  );

  const headHeight = lifelineHeadHeight();

  return (
    <div
      className="relative h-full w-full bg-slate-50"
      data-testid="sequence-canvas"
      onDragOver={onDragOver}
      onDrop={onDrop}
      tabIndex={0}
      onKeyDown={onKeyDown}
    >
      <SvgZoomViewport width={renderable.width} height={renderable.height}>
      <MarkerDefs />
      <svg
        ref={svgRef}
        className="min-h-full min-w-full"
        width={renderable.width}
        height={renderable.height}
        onPointerMove={onCanvasPointerMove}
        onPointerUp={onCanvasPointerUp}
        onPointerLeave={onCanvasPointerUp}
        onDoubleClick={(event) => {
          void onPaneDoubleClick(event);
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            setSelectedLifelineId(null);
            setSelectedMessageId(null);
            onSelectedNodeChange?.(null);
            onSelectedEdgeChange?.(null);
          }
        }}
      >
        <SvgSquareGrid width={renderable.width} height={renderable.height} />
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
            data-element-id={lifeline.id}
            onPointerDown={(event) => onLifelinePointerDown(lifeline.id, event)}
            onClick={(event) => onElementClick(lifeline.id, event)}
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

        {noteElements.map(({ element, node }) => (
          <g
            key={element.id}
            data-testid="sequence-note"
            data-element-id={element.id}
            onClick={(event) => onElementClick(element.id, event)}
          >
            <rect
              x={node.x}
              y={node.y}
              width={node.width}
              height={node.height}
              fill="#fffbeb"
              stroke={selectedLifelineId === element.id ? "#0f172a" : "#f59e0b"}
              strokeWidth={selectedLifelineId === element.id ? 2 : 1}
              rx={2}
            />
            <text
              x={node.x + node.width / 2}
              y={node.y + node.height / 2 + 4}
              textAnchor="middle"
              className="fill-amber-950 text-xs"
            >
              {element.name}
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
            <g
              key={message.id}
              data-testid="sequence-message"
              data-marker-id={message.markerId}
              onClick={(event) => onMessageClick(message.id, event)}
            >
              <line
                x1={message.x1}
                y1={message.y}
                x2={message.x2}
                y2={message.y}
                stroke={stroke}
                strokeWidth={selectedMessageId === message.id ? DEFAULT_STROKE_WIDTH + 0.5 : DEFAULT_STROKE_WIDTH}
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
      </SvgZoomViewport>
    </div>
  );
}
