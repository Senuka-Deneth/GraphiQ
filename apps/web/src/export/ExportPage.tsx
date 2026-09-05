import { useMemo, useRef, useState, type ReactNode } from "react";
import { BackIcon, ZoomInIcon, ZoomOutIcon } from "../chrome/icons.js";
import { useDocumentStore } from "../store/documentStore.js";
import { ExportCropOverlay } from "./ExportCropOverlay.js";
import { ExportPreviewFrame } from "./ExportPreviewFrame.js";
import {
  diagramContentBounds,
  exportSheetSize,
  normalizeCrop,
  rectToSheetPixels,
  resolveExportRect,
  viewportWorldBounds,
  type ExportRect,
} from "./exportBounds.js";
import { downloadCapturedDiagram } from "./exportDocument.js";
import {
  contentModeLabel,
  DEFAULT_EXPORT_SETTINGS,
  paperSizeLabel,
  type ExportContentMode,
  type ExportEntryState,
  type ExportFormat,
  type ExportSettings,
  type PageOrientation,
  type PaperSizeId,
} from "./exportSettings.js";

const FORMATS: readonly ExportFormat[] = ["png", "svg", "pdf"];
const CONTENT_MODES: readonly ExportContentMode[] = [
  "fullCanvas",
  "cropToContent",
  "customCrop",
];
const PAPER_SIZES: readonly PaperSizeId[] = ["a4", "letter", "a3"];

type ExportPageProps = {
  entry: ExportEntryState;
  onClose: () => void;
};

function GlassSwitch({
  checked,
  label,
  testId,
  onChange,
}: {
  checked: boolean;
  label: string;
  testId: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      data-testid={testId}
      className="graphiq-switch"
      onClick={() => onChange(!checked)}
    >
      <span className="graphiq-switch-knob" />
    </button>
  );
}

function OptionRow({
  children,
  active,
  onClick,
  testId,
}: {
  children: ReactNode;
  active: boolean;
  onClick: () => void;
  testId: string;
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      aria-pressed={active}
      className={`graphiq-row w-full ${active ? "bg-[var(--graphiq-island-hover)]" : ""}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export function ExportPage({ entry, onClose }: ExportPageProps) {
  const document = useDocumentStore((state) => state.document);
  const captureRef = useRef<HTMLDivElement>(null);
  const [settings, setSettings] = useState<ExportSettings>(DEFAULT_EXPORT_SETTINGS);
  const [previewZoom, setPreviewZoom] = useState(1);
  const [busy, setBusy] = useState(false);

  const editorViewport = useMemo(
    () =>
      viewportWorldBounds(
        document.overlay.viewport ?? { x: 0, y: 0, zoom: 1 },
        entry.panelWidth,
        entry.panelHeight,
      ),
    [document.overlay.viewport, entry.panelHeight, entry.panelWidth],
  );

  const previewRect = useMemo(() => {
    if (settings.contentMode === "fullCanvas") {
      return editorViewport;
    }
    return diagramContentBounds(document);
  }, [document, editorViewport, settings.contentMode]);

  const crop = settings.customCrop ?? previewRect;

  const exportRect = useMemo(
    () => resolveExportRect({ ...settings, customCrop: crop }, document, editorViewport),
    [crop, document, editorViewport, settings],
  );

  const sheetSize = useMemo(
    () => exportSheetSize(settings, exportRect),
    [exportRect, settings],
  );

  const previewSheetSize = useMemo(
    () => exportSheetSize({ ...settings, setPageSize: false }, previewRect),
    [previewRect, settings],
  );

  const editingCustomCrop = settings.contentMode === "customCrop" && !settings.setPageSize;
  const visibleSource = editingCustomCrop ? previewRect : exportRect;
  const visibleSheet = editingCustomCrop ? previewSheetSize : sheetSize;

  const displayScale = 0.72 * previewZoom;

  const setCustomCrop = (next: ExportRect) => {
    setSettings((current) => ({
      ...current,
      customCrop: normalizeCrop(next, previewRect),
    }));
  };

  const onDownload = async () => {
    const root = captureRef.current;
    if (root === null || busy) {
      return;
    }
    setBusy(true);
    try {
      await downloadCapturedDiagram({
        document,
        captureRoot: root,
        settings,
        sheetSize: visibleSheet,
        clip: editingCustomCrop
          ? rectToSheetPixels(exportRect, visibleSource, visibleSheet)
          : undefined,
      });
    } catch (error) {
      console.error("Export download failed", error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex h-screen flex-col bg-[var(--graphiq-backdrop)]" data-testid="export-page">
      <header className="graphiq-island z-10 mx-3 mt-3 flex h-12 shrink-0 items-center justify-between gap-3 px-2">
        <div className="flex min-w-0 items-center gap-1">
          <button
            type="button"
            className="graphiq-icon-button"
            aria-label="Back to editor"
            data-testid="export-back"
            onClick={onClose}
          >
            <BackIcon />
          </button>
          <div className="min-w-0 truncate px-2 text-[15px] text-[var(--graphiq-label)]">
            <span className="text-[var(--graphiq-label-secondary)]">
              {document.title.trim().length > 0 ? document.title : document.kind}
            </span>
            <span className="text-[var(--graphiq-label-secondary)]"> / </span>
            <span className="font-medium">Export</span>
          </div>
        </div>
        <div className="flex items-center gap-2 pr-1">
          <button
            type="button"
            className="graphiq-control h-8 rounded-[var(--graphiq-radius-pill)] px-3"
            data-testid="export-cancel"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="graphiq-primary-pill"
            data-testid="export-download"
            disabled={busy}
            onClick={() => {
              void onDownload();
            }}
          >
            {busy ? "Preparing…" : "Download"}
          </button>
        </div>
      </header>

      <div className="mt-3 flex min-h-0 flex-1 gap-3 px-3 pb-3">
        <section
          className="relative min-h-0 min-w-0 flex-1 overflow-hidden rounded-[var(--graphiq-radius-island)] bg-[#e5e5ea]"
          data-testid="export-stage"
        >
          <div className="flex h-full w-full items-center justify-center overflow-auto p-8">
            <div
              className="relative overflow-hidden rounded-[10px] bg-white shadow-[0_12px_40px_rgba(0,0,0,0.12)]"
              style={{
                width: visibleSheet.width * displayScale,
                height: visibleSheet.height * displayScale,
              }}
              data-testid="export-preview-sheet"
              data-sheet-width={String(visibleSheet.width)}
              data-sheet-height={String(visibleSheet.height)}
            >
              <div
                style={{
                  width: visibleSheet.width,
                  height: visibleSheet.height,
                  transform: `scale(${displayScale})`,
                  transformOrigin: "top left",
                }}
              >
                <ExportPreviewFrame
                  document={document}
                  sourceRect={visibleSource}
                  sheetSize={visibleSheet}
                  includePageFill={settings.includePageFill}
                  captureRef={captureRef}
                />
              </div>
              {editingCustomCrop ? (
                <ExportCropOverlay
                  bounds={previewRect}
                  crop={crop}
                  scale={displayScale}
                  onChange={setCustomCrop}
                />
              ) : null}
            </div>
          </div>

          <div className="graphiq-island-controls absolute bottom-3 right-3 z-10 flex flex-col">
            <button
              type="button"
              className="graphiq-icon-button"
              aria-label="Preview zoom in"
              data-testid="export-preview-zoom-in"
              onClick={() => setPreviewZoom((zoom) => Math.min(2, Number((zoom + 0.25).toFixed(2))))}
            >
              <ZoomInIcon />
            </button>
            <div className="h-px bg-[var(--graphiq-hairline)]" />
            <button
              type="button"
              className="graphiq-icon-button"
              aria-label="Preview zoom out"
              data-testid="export-preview-zoom-out"
              onClick={() => setPreviewZoom((zoom) => Math.max(0.5, Number((zoom - 0.25).toFixed(2))))}
            >
              <ZoomOutIcon />
            </button>
          </div>
        </section>

        <aside
          className="graphiq-sidebar flex w-72 shrink-0 flex-col overflow-auto rounded-[var(--graphiq-radius-island)] border border-[var(--graphiq-hairline)]"
          data-testid="export-options"
        >
          <div className="graphiq-section-label px-3 pt-3">Options</div>
          <div className="px-3 pt-2 text-[13px] font-medium text-[var(--graphiq-label-secondary)]">
            File format
          </div>
          <div className="graphiq-segment mx-3 mt-2" data-testid="export-format">
            {FORMATS.map((format) => (
              <button
                key={format}
                type="button"
                className="graphiq-segment-item"
                aria-pressed={settings.format === format}
                data-testid={`export-format-${format}`}
                onClick={() => setSettings((current) => ({ ...current, format }))}
              >
                {format.toUpperCase()}
              </button>
            ))}
          </div>

          <div className="px-3 pt-4 text-[13px] font-medium text-[var(--graphiq-label-secondary)]">
            Content
          </div>
          <div className="mx-2 mt-1 flex flex-col">
            {CONTENT_MODES.map((mode) => (
              <OptionRow
                key={mode}
                testId={`export-content-${mode}`}
                active={settings.contentMode === mode}
                onClick={() =>
                  setSettings((current) => ({
                    ...current,
                    contentMode: mode,
                    customCrop:
                      mode === "customCrop"
                        ? (current.customCrop ?? previewRect)
                        : current.customCrop,
                  }))
                }
              >
                {contentModeLabel(mode)}
              </OptionRow>
            ))}
          </div>

          <label className="mx-3 mt-4 flex items-center justify-between gap-3">
            <span className="text-[15px]">Set page size</span>
            <GlassSwitch
              checked={settings.setPageSize}
              label="Set page size"
              testId="export-page-size"
              onChange={(setPageSize) => setSettings((current) => ({ ...current, setPageSize }))}
            />
          </label>
          {settings.setPageSize ? (
            <div className="mx-3 mt-2 flex gap-2">
              <select
                className="graphiq-field h-9 flex-1 px-2"
                aria-label="Paper size"
                data-testid="export-paper-size"
                value={settings.paperSize}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    paperSize: event.target.value as PaperSizeId,
                  }))
                }
              >
                {PAPER_SIZES.map((size) => (
                  <option key={size} value={size}>
                    {paperSizeLabel(size)}
                  </option>
                ))}
              </select>
              <select
                className="graphiq-field h-9 flex-1 px-2"
                aria-label="Page orientation"
                data-testid="export-orientation"
                value={settings.orientation}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    orientation: event.target.value as PageOrientation,
                  }))
                }
              >
                <option value="portrait">Portrait</option>
                <option value="landscape">Landscape</option>
              </select>
            </div>
          ) : null}

          <label className="mx-3 mt-4 mb-4 flex items-center justify-between gap-3">
            <span className="text-[15px]">Include page fill</span>
            <GlassSwitch
              checked={settings.includePageFill}
              label="Include page fill"
              testId="export-page-fill"
              onChange={(includePageFill) =>
                setSettings((current) => ({ ...current, includePageFill }))
              }
            />
          </label>
        </aside>
      </div>
    </div>
  );
}
