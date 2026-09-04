import { EditorShell } from "./chrome/EditorShell.js";

export function App() {
  return (
    <div className="flex h-screen flex-col bg-[var(--color-canvas)] text-[var(--color-ink)]">
      <EditorShell />
    </div>
  );
}
