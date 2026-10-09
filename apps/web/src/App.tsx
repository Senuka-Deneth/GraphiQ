import { lazy, Suspense, useState } from "react";
import { EditorShell } from "./chrome/EditorShell.js";
import type { ExportEntryState } from "./export/exportSettings.js";
import { useDocumentStore } from "./store/documentStore.js";

const ExportPage = lazy(() => import("./export/ExportPage.js").then((module) => ({ default: module.ExportPage })));

export function App() {
  const persistState = useDocumentStore((state) => state.persistState);
  const [exportEntry, setExportEntry] = useState<ExportEntryState | null>(null);

  if (persistState === "loading") {
    return (
      <div
        className="flex h-screen items-center justify-center bg-white"
        data-testid="persist-state"
        data-value="loading"
      >
        <div className="graphiq-blink text-lg font-semibold tracking-tight text-slate-900">
          GraphiQ
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <span
        className="sr-only"
        data-testid="persist-state"
        data-value={persistState}
        aria-live="polite"
      />
      {exportEntry === null ? (
        <EditorShell onOpenExport={setExportEntry} />
      ) : (
        <Suspense fallback={<p role="status" className="m-auto">Preparing export…</p>}>
          <ExportPage entry={exportEntry} onClose={() => setExportEntry(null)} />
        </Suspense>
      )}
    </div>
  );
}
