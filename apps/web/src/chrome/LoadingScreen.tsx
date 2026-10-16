/** Quiet branded loading state shared by startup and lazy-loaded workspaces. */
export function LoadingScreen({ restoring = false }: { restoring?: boolean }) {
  return (
    <div className="graphiq-loading bg-white" role="status" aria-label="Loading GraphiQ"
      data-testid={restoring ? "persist-state" : undefined}
      data-value={restoring ? "loading" : undefined}>
      <span className="graphiq-loading-wordmark graphiq-blink" aria-hidden="true">GraphiQ</span>
    </div>
  );
}
