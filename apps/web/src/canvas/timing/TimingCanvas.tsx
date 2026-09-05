import { useCallback, useMemo, useRef, useState } from "react";
import { MarkerDefs } from "../class/MarkerDefs.js";
import { SvgSquareGrid, SvgZoomViewport } from "../SvgZoomViewport.js";
import { useCanvasMode } from "../canvasMode.js";
import { DEFAULT_STROKE_WIDTH } from "../canvasDefaults.js";
import { useDocumentStore, type StencilDropKind } from "../../store/documentStore.js";
import { DeleteIcon } from "../../chrome/icons.js";
import {
  dashStrokeStyle,
  lifelineDisplayName,
  strokeForDiagnostic,
  svgXToTime,
  timingModelToSvg,
} from "./modelToSvg.js";

export function TimingCanvas({
  onSelectedNodeChange,
  onSelectedEdgeChange,
}: {
  onSelectedNodeChange?: (nodeId: string | null) => void;
  onSelectedEdgeChange?: (edgeId: string | null) => void;
}) {
  const isPreview = useCanvasMode() === "preview";
  const model = useDocumentStore((state) => state.document.model);
  const overlay = useDocumentStore((state) => state.document.overlay);
  const diagnostics = useDocumentStore((state) => state.diagnostics);
  const updateNodePosition = useDocumentStore((state) => state.updateNodePosition);
  const connectElements = useDocumentStore((state) => state.connectElements);
  const dropStencilElement = useDocumentStore((state) => state.dropStencilElement);
  const deleteElements = useDocumentStore((state) => state.deleteElements);
  const deleteRelationships = useDocumentStore((state) => state.deleteRelationships);
  const renameSelectedElement = useDocumentStore((state) => state.renameSelectedElement);

  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedLifelineId, setSelectedLifelineId] = useState<string | null>(null);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<number>(0);
  const [dragState, setDragState] = useState<{
    lifelineId: string;
    offsetY: number;
    y: number;
  } | null>(null);

  const renderable = useMemo(
    () => timingModelToSvg(model, overlay, diagnostics),
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
      setSelectedMessageId(null);
      onSelectedNodeChange?.(lifelineId);
      onSelectedEdgeChange?.(null);
      setDragState({
        lifelineId,
        offsetY: point.y - lifeline.y,
        y: lifeline.y,
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
      setDragState({
        ...dragState,
        y: Math.max(0, point.y - dragState.offsetY),
      });
    },
    [clientToSvg, dragState],
  );

  const onCanvasPointerUp = useCallback(() => {
    if (dragState !== null) {
      const existing = overlay.nodes[dragState.lifelineId];
      updateNodePosition(dragState.lifelineId, existing?.x ?? 0, dragState.y);
    }
    setDragState(null);
  }, [dragState, overlay.nodes, updateNodePosition]);

  const onElementClick = useCallback(
    (elementId: string, event: React.MouseEvent) => {
      event.stopPropagation();
      const point = clientToSvg(event.clientX, event.clientY);
      const time = svgXToTime(point.x);

      if (selectedLifelineId !== null && selectedLifelineId !== elementId) {
        void connectElements(selectedLifelineId, elementId, { time: selectedTime });
        setSelectedLifelineId(null);
        onSelectedNodeChange?.(null);
        onSelectedEdgeChange?.(null);
        return;
      }

      setSelectedLifelineId(elementId);
      setSelectedTime(time);
      setSelectedMessageId(null);
      onSelectedNodeChange?.(elementId);
      onSelectedEdgeChange?.(null);
    },
    [clientToSvg, connectElements, onSelectedEdgeChange, onSelectedNodeChange, selectedLifelineId, selectedTime],
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
      if (selectedMessageId !== null) {
        event.preventDefault();
        void deleteRelationships([selectedMessageId]);
        setSelectedMessageId(null);
        onSelectedEdgeChange?.(null);
        return;
      }
      if (selectedLifelineId === null) {
        return;
      }
      event.preventDefault();
      void deleteElements([selectedLifelineId]);
      setSelectedLifelineId(null);
      onSelectedNodeChange?.(null);
    },
    [
      deleteElements,
      deleteRelationships,
      onSelectedEdgeChange,
      onSelectedNodeChange,
      selectedLifelineId,
      selectedMessageId,
    ],
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

  return (
    <div
      className={`relative h-full w-full ${isPreview ? "bg-transparent" : "bg-slate-50"}`}
      data-testid="timing-canvas"
      data-canvas-mode={isPreview ? "preview" : "editor"}
      onDragOver={isPreview ? undefined : onDragOver}
      onDrop={isPreview ? undefined : onDrop}
      tabIndex={isPreview ? undefined : 0}
      onKeyDown={isPreview ? undefined : onKeyDown}
    >
      {!isPreview && (selectedLifelineId !== null || selectedMessageId !== null) ? (
        <button
          type="button"
          className="graphiq-island-controls graphiq-icon-button absolute left-3 top-3 z-20"
          aria-label="Delete element"
          data-testid="delete-element"
          onClick={() => {
            if (selectedMessageId !== null) {
              void deleteRelationships([selectedMessageId]);
              setSelectedMessageId(null);
              onSelectedEdgeChange?.(null);
              return;
            }
            if (selectedLifelineId !== null) {
              void deleteElements([selectedLifelineId]);
              setSelectedLifelineId(null);
              onSelectedNodeChange?.(null);
            }
          }}
        >
          <DeleteIcon />
        </button>
      ) : null}
      <SvgZoomViewport width={renderable.width} height={renderable.height} chrome={!isPreview}>
      <MarkerDefs />
      <svg
        ref={svgRef}
        className="min-h-full min-w-full"
        width={renderable.width}
        height={renderable.height}
        style={isPreview ? { pointerEvents: "none" } : undefined}
        onPointerMove={isPreview ? undefined : onCanvasPointerMove}
        onPointerUp={isPreview ? undefined : onCanvasPointerUp}
        onPointerLeave={isPreview ? undefined : onCanvasPointerUp}
        onDoubleClick={
          isPreview
            ? undefined
            : (event) => {
                void onPaneDoubleClick(event);
              }
        }
        onClick={
          isPreview
            ? undefined
            : (event) => {
                if (event.target === event.currentTarget) {
                  setSelectedLifelineId(null);
                  setSelectedMessageId(null);
                  onSelectedNodeChange?.(null);
                  onSelectedEdgeChange?.(null);
                }
              }
        }
      >
        {isPreview ? null : <SvgSquareGrid width={renderable.width} height={renderable.height} />}
        <line
          x1={160}
          y1={renderable.axisY}
          x2={renderable.width - 40}
          y2={renderable.axisY}
          stroke="#64748b"
          strokeWidth={1}
          data-testid="timing-axis"
        />

        {renderable.ticks.map((tick) => (
          <g key={tick.time} data-testid="timing-axis-tick">
            <line
              x1={tick.x}
              y1={renderable.axisY - 4}
              x2={tick.x}
              y2={renderable.axisY + 4}
              stroke="#64748b"
              strokeWidth={1}
            />
            <text
              x={tick.x}
              y={renderable.axisY - 8}
              textAnchor="middle"
              className="fill-slate-600 text-[10px]"
            >
              {tick.time}
            </text>
          </g>
        ))}

        {renderable.lifelines.map((lifeline) => {
          const previewY =
            dragState !== null && dragState.lifelineId === lifeline.id
              ? dragState.y - lifeline.y
              : 0;
          return (
          <g
            key={lifeline.id}
            data-testid="timing-lifeline"
            data-element-id={lifeline.id}
            transform={`translate(0 ${previewY})`}
            onPointerDown={(event) => onLifelinePointerDown(lifeline.id, event)}
            onClick={(event) => onElementClick(lifeline.id, event)}
          >
            <line
              x1={160}
              y1={lifeline.rowCenterY}
              x2={renderable.width - 40}
              y2={lifeline.rowCenterY}
              stroke={strokeForDiagnostic(lifeline.diagnosticSeverity) ?? "#cbd5e1"}
              strokeWidth={1}
            />
            <text
              x={8}
              y={lifeline.rowCenterY + 4}
              data-testid="lifeline-name"
              className="fill-slate-900 text-xs font-medium"
            >
              {lifelineDisplayName(lifeline)}
            </text>
            <rect
              x={lifeline.x}
              y={lifeline.y}
              width={lifeline.width}
              height={lifeline.height}
              fill="transparent"
              stroke={
                selectedLifelineId === lifeline.id
                  ? "#0f172a"
                  : strokeForDiagnostic(lifeline.diagnosticSeverity) ?? "transparent"
              }
              strokeWidth={selectedLifelineId === lifeline.id ? 2 : 0}
            />
          </g>
          );
        })}

        {noteElements.map(({ element, node }) => (
          <g
            key={element.id}
            data-testid="timing-note"
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

        {renderable.states.map((state) => (
          <g key={state.id} data-testid="timing-state">
            <rect
              x={state.x}
              y={state.y}
              width={state.width}
              height={state.height}
              fill="#dbeafe"
              stroke={strokeForDiagnostic(state.diagnosticSeverity) ?? "#2563eb"}
              strokeWidth={1}
              rx={2}
            />
            <text
              x={state.x + 6}
              y={state.y + state.height / 2 + 4}
              className="fill-slate-900 text-xs"
            >
              {state.name}
            </text>
          </g>
        ))}

        {renderable.messages.map((message) => {
          const stroke = strokeForDiagnostic(message.diagnosticSeverity) ?? "#0f172a";
          const dashProps = message.lineStyle === "dash" ? dashStrokeStyle : {};
          return (
            <g
              key={message.id}
              data-testid="timing-message"
              data-marker-id={message.markerId}
              onClick={(event) => onMessageClick(message.id, event)}
            >
              <line
                x1={message.x}
                y1={message.y1}
                x2={message.x}
                y2={message.y2}
                stroke={stroke}
                strokeWidth={selectedMessageId === message.id ? DEFAULT_STROKE_WIDTH + 0.5 : DEFAULT_STROKE_WIDTH}
                markerEnd={`url(#${message.markerId})`}
                {...dashProps}
              />
              {message.label !== undefined ? (
                <text
                  x={message.x + 6}
                  y={(message.y1 + message.y2) / 2}
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
