import { createContext, useContext } from "react";

export type CanvasMode = "editor" | "preview";

export const CanvasModeContext = createContext<CanvasMode>("editor");

export function useCanvasMode(): CanvasMode {
  return useContext(CanvasModeContext);
}

export type PreviewViewport = {
  x: number;
  y: number;
  zoom: number;
};

export const PreviewViewportContext = createContext<PreviewViewport | null>(null);

export function usePreviewViewport(): PreviewViewport | null {
  return useContext(PreviewViewportContext);
}
