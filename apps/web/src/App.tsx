import { useState } from "react";
import { EditorShell } from "./chrome/EditorShell.js";
import { ExportPage } from "./export/ExportPage.js";
import type { ExportEntryState } from "./export/exportSettings.js";
import { useDocumentStore } from "./store/documentStore.js";

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
        <ExportPage entry={exportEntry} onClose={() => setExportEntry(null)} />
      )}
    </div>
  );
}
