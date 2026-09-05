import type { Ref } from "react";
import { KindCanvas } from "../canvas/KindCanvas.js";
import { PreviewViewportContext } from "../canvas/canvasMode.js";
import type { GraphiqDocument } from "../store/documentStore.js";
import { containFit, viewportForBounds, type ExportRect } from "./exportBounds.js";

export type ExportPreviewFrameProps = {
  document: GraphiqDocument;
  sourceRect: ExportRect;
  sheetSize: { width: number; height: number };
  includePageFill: boolean;
  captureTestId?: string;
  captureRef?: Ref<HTMLDivElement | null>;
};

function isSvgKind(kind: GraphiqDocument["kind"]): boolean {
  return kind === "sequence" || kind === "timing";
}

export function ExportPreviewFrame({
  document,
  sourceRect,
  sheetSize,
  includePageFill,
  captureTestId = "export-capture-root",
  captureRef,
}: ExportPreviewFrameProps) {
  const viewport = viewportForBounds(sourceRect, sheetSize.width, sheetSize.height);
  const svgFit = containFit(sourceRect, sheetSize, 0, Number.POSITIVE_INFINITY);
  const svgScale = svgFit.width / Math.max(1, sourceRect.width);

  return (
    <div
      ref={captureRef}
      data-testid={captureTestId}
      className={includePageFill ? "bg-white" : "bg-transparent"}
      style={{
        width: sheetSize.width,
        height: sheetSize.height,
        overflow: "hidden",
        position: "relative",
      }}
    >
      {isSvgKind(document.kind) ? (
        <div
          className="h-full w-full"
          style={{
            transform: `translate(${svgFit.x - sourceRect.x * svgScale}px, ${svgFit.y - sourceRect.y * svgScale}px) scale(${svgScale})`,
            transformOrigin: "0 0",
            width: sourceRect.width,
            height: sourceRect.height,
          }}
        >
          <KindCanvas key={document.id} kind={document.kind} mode="preview" />
        </div>
      ) : (
        <PreviewViewportContext.Provider value={viewport}>
          <KindCanvas key={document.id} kind={document.kind} mode="preview" />
        </PreviewViewportContext.Provider>
      )}
    </div>
  );
}
