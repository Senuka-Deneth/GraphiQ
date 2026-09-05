import { useDocumentStore } from "./store/documentStore.js";
import { EditorShell } from "./chrome/EditorShell.js";

export function App() {
  const persistState = useDocumentStore((state) => state.persistState);

  if (persistState === "loading") {
    return (
      <div
        className="flex h-screen items-center justify-center bg-[var(--color-canvas)] text-[var(--color-ink)]"
        data-testid="persist-state"
        data-value="loading"
      >
        Loading…
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-[var(--color-canvas)] text-[var(--color-ink)]">
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
