import { emptyOverlay, layoutDocument } from "@graphiq/uml-layout";
import { parse } from "@graphiq/uml-dsl";
import { bindDiagnosticSpans } from "../diagnostics/bindDiagnosticSpans.js";
import {
  useDocumentStore,
  type GraphiqDocument,
  type PersistState,
} from "../store/documentStore.js";
import { validate } from "@graphiq/uml-rules";
import {
  clearPersistedData,
  loadLastDocument,
  saveDocument,
  setLastOpenId,
} from "./documentPersist.js";

const AUTOSAVE_DEBOUNCE_MS = 500;

let hydrationComplete = false;
let autosaveTimer: ReturnType<typeof setTimeout> | null = null;
let pendingDocument: GraphiqDocument | null = null;
let unsubscribe: (() => void) | null = null;

function setPersistState(state: PersistState): void {
  useDocumentStore.setState({ persistState: state });
}

async function restoreDocument(document: GraphiqDocument): Promise<void> {
  let overlay = document.overlay;
  if (
    Object.keys(overlay.nodes).length === 0 &&
    document.model.elements.length > 0
  ) {
    overlay = await layoutDocument(
      document.kind,
      document.model,
      emptyOverlay(),
      "first-open-empty-overlay",
    );
  }

  const parseResult = parse(document.kind, document.dsl);
  const lastParseSource = parseResult.ok
    ? {
        text: document.dsl,
        ast: parseResult.value.ast,
        comments: parseResult.value.comments,
      }
    : null;

  const modelDiagnostics = validate(document.kind, document.model);
  const diagnostics =
    parseResult.ok && lastParseSource !== null
      ? bindDiagnosticSpans(parseResult.value.ast, document.model, [
          ...parseResult.value.diagnostics,
          ...modelDiagnostics,
        ])
      : modelDiagnostics;

  useDocumentStore.setState({
    document: {
      ...document,
      overlay,
    },
    diagnostics,
    lastGoodModel: document.model,
    lastGoodOverlay: overlay,
    lastParseSource,
    dslRevision: 0,
    parseTimer: null,
  });
}

async function flushPendingSave(): Promise<void> {
  if (autosaveTimer !== null) {
    clearTimeout(autosaveTimer);
    autosaveTimer = null;
  }
  if (pendingDocument !== null) {
    const document = pendingDocument;
    pendingDocument = null;
    await saveDocument(document);
    await setLastOpenId(document.id);
    setPersistState("saved");
  }
}

function scheduleAutosave(document: GraphiqDocument): void {
  if (!hydrationComplete) {
    return;
  }

  pendingDocument = document;
  setPersistState("saving");

  if (autosaveTimer !== null) {
    clearTimeout(autosaveTimer);
  }

  autosaveTimer = setTimeout(() => {
    autosaveTimer = null;
    void (async () => {
      if (pendingDocument === null) {
        setPersistState("saved");
        return;
      }
      const toSave = pendingDocument;
      pendingDocument = null;
      await saveDocument(toSave);
      await setLastOpenId(toSave.id);
      setPersistState("saved");
    })();
  }, AUTOSAVE_DEBOUNCE_MS);
}

function documentSnapshotChanged(
  current: GraphiqDocument,
  previous: GraphiqDocument,
): boolean {
  return (
    current.id !== previous.id ||
    current.kind !== previous.kind ||
    current.title !== previous.title ||
    current.dsl !== previous.dsl ||
    current.model !== previous.model ||
    current.overlay !== previous.overlay
  );
}

function startAutosaveSubscription(): void {
  unsubscribe?.();
  unsubscribe = useDocumentStore.subscribe((state, previousState) => {
    if (!hydrationComplete) {
      return;
    }
    if (!documentSnapshotChanged(state.document, previousState.document)) {
      return;
    }
    scheduleAutosave(state.document);
  });
}

export async function hydrateDocumentStore(): Promise<void> {
  setPersistState("loading");

  const stored = await loadLastDocument();
  if (stored !== undefined) {
    await restoreDocument(stored);
  }

  hydrationComplete = true;
  setPersistState("saved");
  startAutosaveSubscription();
}

export async function persistNewDocument(document: GraphiqDocument): Promise<void> {
  await flushPendingSave();
  await saveDocument(document);
  await setLastOpenId(document.id);
  pendingDocument = null;
  setPersistState("saved");
}

export async function resetPersistenceForTests(): Promise<void> {
  hydrationComplete = false;
  if (autosaveTimer !== null) {
    clearTimeout(autosaveTimer);
    autosaveTimer = null;
  }
  pendingDocument = null;
  unsubscribe?.();
  unsubscribe = null;
  await clearPersistedData();
  setPersistState("loading");
}

export async function initDocumentPersistenceForTests(): Promise<void> {
  await resetPersistenceForTests();
  await hydrateDocumentStore();
}
