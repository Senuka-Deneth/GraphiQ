import { useDocumentStore } from "./store/documentStore.js";
import { EditorShell } from "./chrome/EditorShell.js";

export function App() {
  const persistState = useDocumentStore((state) => state.persistState);

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
      <EditorShell />
    </div>
  );
}
