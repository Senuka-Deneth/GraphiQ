import { toBlob, toSvg } from "html-to-image";
import { EXPORT_PIXEL_RATIO, type ExportRect } from "./exportSettings.js";

export type CaptureLiveOptions = {
  width: number;
  height: number;
  pixelRatio?: number;
  backgroundColor?: string;
  clip?: ExportRect;
};

function isExportChrome(node: Node): boolean {
  if (!(node instanceof Element)) {
    return false;
  }

  const className = node.getAttribute("class") ?? "";
  if (
    className.includes("react-flow__handle") ||
    className.includes("react-flow__attribution") ||
    className.includes("react-flow__controls") ||
    className.includes("react-flow__background") ||
    className.includes("graphiq-island-controls") ||
    className.includes("graphiq-resize-handle") ||
    className.includes("graphiq-resize-line")
  ) {
    return true;
  }

  const testId = node.getAttribute("data-testid");
  return (
    testId === "node-selection-toolbar" ||
    testId === "flow-zoom-in" ||
    testId === "flow-zoom-out" ||
    testId === "flow-fit-view" ||
    testId === "svg-zoom-in" ||
    testId === "svg-zoom-out" ||
    testId === "delete-element" ||
    testId === "export-crop-overlay" ||
    (testId !== null && testId.startsWith("export-crop-handle-"))
  );
}

export function exportDomFilter(node: Node): boolean {
  return !isExportChrome(node);
}

const MARKER_URL_ID = /url\(\s*#([^)]+?)\s*\)/;

function markerIdsFromRef(value: string | null): string[] {
  if (value === null || value.length === 0) {
    return [];
  }
  const match = MARKER_URL_ID.exec(value);
  return match?.[1] === undefined ? [] : [match[1]];
}

export function inlineSvgMarkers(root: HTMLElement): () => void {
  const restorers: Array<() => void> = [];
  const sourceMarkers = new Map<string, SVGMarkerElement>();
  for (const marker of root.querySelectorAll("marker")) {
    if (marker.id.length > 0 && !sourceMarkers.has(marker.id)) {
      sourceMarkers.set(marker.id, marker);
    }
  }
  if (sourceMarkers.size === 0) {
    return () => undefined;
  }

  const svgNs = "http://www.w3.org/2000/svg";
  for (const svg of root.querySelectorAll("svg")) {
    const refs = new Set<string>();
    for (const element of svg.querySelectorAll("[marker-end], [marker-start]")) {
      for (const id of markerIdsFromRef(element.getAttribute("marker-end"))) {
        refs.add(id);
      }
      for (const id of markerIdsFromRef(element.getAttribute("marker-start"))) {
        refs.add(id);
      }
    }
    if (refs.size === 0) {
      continue;
    }
    const existing = new Set([...svg.querySelectorAll("marker")].map((item) => item.id));
    const missing = [...refs].filter((id) => !existing.has(id) && sourceMarkers.has(id));
    if (missing.length === 0) {
      continue;
    }
    let defs = svg.querySelector(":scope > defs");
    if (defs === null) {
      defs = document.createElementNS(svgNs, "defs");
      svg.insertBefore(defs, svg.firstChild);
      const created = defs;
      restorers.push(() => created.remove());
    }
    for (const id of missing) {
      const original = sourceMarkers.get(id);
      if (original === undefined) {
        continue;
      }
      const clone = original.cloneNode(true);
      if (!(clone instanceof Element)) {
        continue;
      }
      defs.appendChild(clone);
      restorers.push(() => clone.remove());
    }
  }

  for (const marker of sourceMarkers.values()) {
    const host = marker.closest("svg");
    if (host?.querySelector("[marker-end], [marker-start]") !== null) {
      continue;
    }
    const id = marker.id;
    marker.removeAttribute("id");
    restorers.push(() => marker.setAttribute("id", id));
  }

  return () => {
    for (const restore of [...restorers].reverse()) {
      restore();
    }
  };
}

export async function waitForExportPaint(): Promise<void> {
  if (typeof document !== "undefined" && document.fonts !== undefined) {
    await document.fonts.ready;
  }
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}

function captureStyle(options: CaptureLiveOptions): Partial<CSSStyleDeclaration> {
  const clip = options.clip;
  if (clip === undefined) {
    return {
      width: `${options.width}px`,
      height: `${options.height}px`,
      transform: "none",
    };
  }
  return {
    width: `${options.width}px`,
    height: `${options.height}px`,
    transform: `translate(${-clip.x}px, ${-clip.y}px)`,
  };
}

function captureOutputSize(options: CaptureLiveOptions): { width: number; height: number } {
  if (options.clip === undefined) {
    return { width: options.width, height: options.height };
  }
  return {
    width: Math.max(1, Math.round(options.clip.width)),
    height: Math.max(1, Math.round(options.clip.height)),
  };
}

async function capturePngBlob(element: HTMLElement, options: CaptureLiveOptions): Promise<Blob> {
  const output = captureOutputSize(options);
  const restoreMarkers = inlineSvgMarkers(element);
  try {
    const blob = await toBlob(element, {
      width: output.width,
      height: output.height,
      pixelRatio: options.pixelRatio ?? EXPORT_PIXEL_RATIO,
      backgroundColor: options.backgroundColor,
      cacheBust: false,
      filter: exportDomFilter,
      style: captureStyle(options),
    });
    if (blob === null) {
      throw new Error("PNG capture failed");
    }
    return blob;
  } finally {
    restoreMarkers();
  }
}

export async function captureElementPng(
  element: HTMLElement,
  options: CaptureLiveOptions,
): Promise<Blob> {
  return capturePngBlob(element, options);
}

export async function captureElementSvg(
  element: HTMLElement,
  options: CaptureLiveOptions,
): Promise<string> {
  const output = captureOutputSize(options);
  const restoreMarkers = inlineSvgMarkers(element);
  try {
    return await toSvg(element, {
      width: output.width,
      height: output.height,
      pixelRatio: 1,
      backgroundColor: options.backgroundColor,
      cacheBust: false,
      filter: exportDomFilter,
      style: captureStyle(options),
    });
  } finally {
    restoreMarkers();
  }
}

export async function captureLiveDiagram(
  element: HTMLElement,
  options: CaptureLiveOptions,
): Promise<{ png: Blob; svg: string }> {
  await waitForExportPaint();
  const png = await captureElementPng(element, options);
  const svg = await captureElementSvg(element, options);
  return { png, svg };
}
