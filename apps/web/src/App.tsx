import { ClassCanvas } from "./canvas/class/ClassCanvas";

export function App() {
  return (
    <div className="flex h-screen flex-col bg-[var(--color-canvas)] text-[var(--color-ink)]">
      <header className="border-b border-slate-300 px-4 py-3">
        <h1 className="text-xl font-semibold tracking-tight">GraphiQ</h1>
      </header>
      <main className="min-h-0 flex-1">
        <ClassCanvas />
      </main>
    </div>
  );
}
