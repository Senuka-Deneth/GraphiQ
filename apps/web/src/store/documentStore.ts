import { createId, type Diagnostic } from "@graphiq/uml-core";
import { emptyOverlay, layoutDocument, type NotationOverlay } from "@graphiq/uml-layout";
import { emptyModel, type UmlModel } from "@graphiq/uml-model";
import { parse } from "@graphiq/uml-dsl";
import { classAstToModel } from "@graphiq/uml-print";
import { validate } from "@graphiq/uml-rules";
import { create } from "zustand";

export type GraphiqDocument = {
  id: string;
  kind: "class";
  title: string;
  model: UmlModel;
  overlay: NotationOverlay;
  dsl: string;
};

type DocumentStoreState = {
  document: GraphiqDocument;
  diagnostics: Diagnostic[];
  lastGoodModel: UmlModel;
  lastGoodOverlay: NotationOverlay;
  dslRevision: number;
  parseTimer: ReturnType<typeof setTimeout> | null;
  setTitle: (title: string) => void;
  setDsl: (dsl: string) => void;
  runParse: () => Promise<void>;
};

const INITIAL_DSL = "diagram class\n";

function createInitialDocument(): GraphiqDocument {
  const model = emptyModel("class");
  return {
    id: createId(),
    kind: "class",
    title: "Untitled class diagram",
    model,
    overlay: emptyOverlay(),
    dsl: INITIAL_DSL,
  };
}

function hasFatalParseErrors(diagnostics: readonly Diagnostic[]): boolean {
  return diagnostics.some((diagnostic) => diagnostic.severity === "error");
}

export const useDocumentStore = create<DocumentStoreState>((set, get) => {
  const initialDocument = createInitialDocument();

  return {
    document: initialDocument,
    diagnostics: [],
    lastGoodModel: initialDocument.model,
    lastGoodOverlay: initialDocument.overlay,
    dslRevision: 0,
    parseTimer: null,

    setTitle: (title) => {
      set((state) => ({
        document: {
          ...state.document,
          title,
        },
      }));
    },

    setDsl: (dsl) => {
      const { parseTimer } = get();
      if (parseTimer !== null) {
        clearTimeout(parseTimer);
      }

      const nextTimer = setTimeout(() => {
        void get().runParse();
      }, 150);

      set((state) => ({
        document: {
          ...state.document,
          dsl,
        },
        parseTimer: nextTimer,
      }));
    },

    runParse: async () => {
      const { document, lastGoodModel, lastGoodOverlay } = get();
      const parseResult = parse("class", document.dsl);

      if (!parseResult.ok) {
        set({
          diagnostics: parseResult.error.diagnostics,
          parseTimer: null,
        });
        return;
      }

      const { ast, diagnostics: parseDiagnostics } = parseResult.value;

      if (hasFatalParseErrors(parseDiagnostics)) {
        set({
          diagnostics: parseDiagnostics,
          parseTimer: null,
        });
        return;
      }

      const model = classAstToModel(ast, lastGoodModel);
      const modelDiagnostics = validate("class", model);
      const diagnostics = [...parseDiagnostics, ...modelDiagnostics];

      const overlayBase = lastGoodOverlay;
      const reason =
        Object.keys(overlayBase.nodes).length === 0
          ? "first-open-empty-overlay"
          : "topology-changed";
      const overlay = await layoutDocument("class", model, overlayBase, reason);

      set({
        document: {
          ...document,
          model,
          overlay,
          title: ast.name ?? document.title,
        },
        lastGoodModel: model,
        lastGoodOverlay: overlay,
        diagnostics,
        parseTimer: null,
      });
    },
  };
});

export function resetDocumentStoreForTests(): void {
  const initialDocument = createInitialDocument();
  useDocumentStore.setState({
    document: initialDocument,
    diagnostics: [],
    lastGoodModel: initialDocument.model,
    lastGoodOverlay: initialDocument.overlay,
    dslRevision: 0,
    parseTimer: null,
  });
}
