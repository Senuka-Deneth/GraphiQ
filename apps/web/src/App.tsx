import { lazy, Suspense, useState } from "react";
import { LoadingScreen } from "./chrome/LoadingScreen.js";
import { EditorShell } from "./chrome/EditorShell.js";
import type { ExportEntryState } from "./export/exportSettings.js";
import { useDocumentStore } from "./store/documentStore.js";

const ExportPage = lazy(() => import("./export/ExportPage.js").then((module) => ({ default: module.ExportPage })));

export function App() {
  const persistState = useDocumentStore((state) => state.persistState);
  const [exportEntry, setExportEntry] = useState<ExportEntryState | null>(null);

  if (persistState === "loading") {
    return <LoadingScreen restoring />;
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
        <Suspense fallback={<LoadingScreen />}>
          <ExportPage entry={exportEntry} onClose={() => setExportEntry(null)} />
        </Suspense>
      )}
    </div>
  );
}
