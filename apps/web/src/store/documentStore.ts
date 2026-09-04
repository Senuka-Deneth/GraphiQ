import { createId, type Diagnostic } from "@graphiq/uml-core";
import { emptyOverlay, layoutDocument, measureClassNode, measureObjectNode, type NotationOverlay } from "@graphiq/uml-layout";
import {
  addElement,
  addRelationship,
  emptyModel,
  removeElement,
  removeRelationship,
  renameElement,
  setClassAttribute,
  type ModelCommandError,
  type UmlModel,
} from "@graphiq/uml-model";
import type { RelationshipType } from "@graphiq/uml-model";
import { parse } from "@graphiq/uml-dsl";
import { astToModel, print } from "@graphiq/uml-print";
import { isConnectorAllowed, validate } from "@graphiq/uml-rules";
import type { Result } from "@graphiq/uml-core";
import { create } from "zustand";
import { bindDiagnosticSpans } from "../diagnostics/bindDiagnosticSpans.js";

export type ImplementedDiagramKind = "class" | "object";

export type GraphiqDocument = {
  id: string;
  kind: ImplementedDiagramKind;
  title: string;
  model: UmlModel;
  overlay: NotationOverlay;
  dsl: string;
};

export type ClassRelationshipTool = Extract<
  RelationshipType,
  | "association"
  | "aggregation"
  | "composition"
  | "generalization"
  | "realization"
  | "dependency"
>;

export type ObjectRelationshipTool = Extract<RelationshipType, "link" | "dependency">;

export type RelationshipTool = ClassRelationshipTool | ObjectRelationshipTool;

export type ClassStencilDropKind =
  | "class"
  | "interface"
  | "enumeration"
  | "abstract-class"
  | "note";

export type ObjectStencilDropKind = "instance" | "note";

export type StencilDropKind = ClassStencilDropKind | ObjectStencilDropKind;

type DocumentStoreState = {
  document: GraphiqDocument;
  diagnostics: Diagnostic[];
  lastGoodModel: UmlModel;
  lastGoodOverlay: NotationOverlay;
  dslRevision: number;
  parseTimer: ReturnType<typeof setTimeout> | null;
  dslEditorFocused: boolean;
  relationshipTool: RelationshipTool;
  setTitle: (title: string) => void;
  setDsl: (dsl: string) => void;
  setDslEditorFocused: (focused: boolean) => void;
  setRelationshipTool: (tool: RelationshipTool) => void;
  createDocument: (kind: ImplementedDiagramKind) => void;
  runParse: () => Promise<void>;
  updateNodePosition: (nodeId: string, x: number, y: number) => void;
  dropStencilElement: (kind: StencilDropKind, x: number, y: number) => Promise<void>;
  connectElements: (sourceId: string, targetId: string) => Promise<void>;
  deleteElements: (elementIds: readonly string[]) => Promise<void>;
  deleteRelationships: (relationshipIds: readonly string[]) => Promise<void>;
  renameSelectedElement: (elementId: string, name: string) => Promise<void>;
  editFirstAttribute: (elementId: string, value: string) => Promise<void>;
};

const INITIAL_DSL_BY_KIND: Record<ImplementedDiagramKind, string> = {
  class: "diagram class\n",
  object: "diagram object\n",
};

const DEFAULT_TITLE_BY_KIND: Record<ImplementedDiagramKind, string> = {
  class: "Untitled class diagram",
  object: "Untitled object diagram",
};

const DEFAULT_RELATIONSHIP_TOOL_BY_KIND: Record<ImplementedDiagramKind, RelationshipTool> = {
  class: "generalization",
  object: "link",
};

const ILLEGAL_CONNECTOR_RULE_ID = "rules.illegal-connector";

function createDocumentForKind(kind: ImplementedDiagramKind): GraphiqDocument {
  const model = emptyModel(kind);
  return {
    id: createId(),
    kind,
    title: DEFAULT_TITLE_BY_KIND[kind],
    model,
    overlay: emptyOverlay(),
    dsl: INITIAL_DSL_BY_KIND[kind],
  };
}

function createInitialDocument(): GraphiqDocument {
  return createDocumentForKind("class");
}

function hasFatalErrors(diagnostics: readonly Diagnostic[]): boolean {
  return diagnostics.some((diagnostic) => diagnostic.severity === "error");
}

function uniqueElementName(model: UmlModel, base: string): string {
  if (!model.elements.some((element) => element.name === base)) {
    return base;
  }

  let counter = 2;
  while (model.elements.some((element) => element.name === `${base}${counter}`)) {
    counter += 1;
  }
  return `${base}${counter}`;
}

function printDocumentDsl(document: GraphiqDocument, model: UmlModel): string {
  const defaultTitle = DEFAULT_TITLE_BY_KIND[document.kind];
  const title =
    document.title.trim().length > 0 && document.title !== defaultTitle
      ? document.title
      : undefined;
  return print(document.kind, model, { name: title });
}

function canApplyStructuralCommand(state: DocumentStoreState): boolean {
  return !state.dslEditorFocused && state.parseTimer === null;
}

async function commitStructuralModelChange(
  get: () => DocumentStoreState,
  set: (partial: Partial<DocumentStoreState> | ((state: DocumentStoreState) => Partial<DocumentStoreState>)) => void,
  nextModel: UmlModel,
  overlayPatch?: (overlay: NotationOverlay, model: UmlModel) => NotationOverlay,
): Promise<boolean> {
  const { document, lastGoodOverlay } = get();
  const diagnostics = validate(document.kind, nextModel);

  if (hasFatalErrors(diagnostics)) {
    set({ diagnostics });
    return false;
  }

  const overlayBase = overlayPatch ? overlayPatch(lastGoodOverlay, nextModel) : lastGoodOverlay;
  const reason =
    Object.keys(overlayBase.nodes).length === 0
      ? "first-open-empty-overlay"
      : "topology-changed";
  const overlay = await layoutDocument(document.kind, nextModel, overlayBase, reason);
  const dsl = printDocumentDsl(document, nextModel);

  set((state) => ({
    document: {
      ...state.document,
      model: nextModel,
      overlay,
      dsl,
    },
    lastGoodModel: nextModel,
    lastGoodOverlay: overlay,
    diagnostics,
    dslRevision: state.dslRevision + 1,
  }));

  return true;
}

function applyModelCommand(
  get: () => DocumentStoreState,
  set: (partial: Partial<DocumentStoreState> | ((state: DocumentStoreState) => Partial<DocumentStoreState>)) => void,
  command: (model: UmlModel) => Result<UmlModel, ModelCommandError>,
  overlayPatch?: (overlay: NotationOverlay, model: UmlModel) => NotationOverlay,
): Promise<boolean> {
  if (!canApplyStructuralCommand(get())) {
    return Promise.resolve(false);
  }

  const { document } = get();
  const result = command(document.model);
  if (!result.ok) {
    set({
      diagnostics: [
        {
          id: createId(),
          ruleId: result.error.code,
          severity: "error",
          message: result.error.message,
          elementIds: [],
        },
      ],
    });
    return Promise.resolve(false);
  }

  return commitStructuralModelChange(get, set, result.value, overlayPatch);
}

function defaultOverlayNode(
  model: UmlModel,
  elementId: string,
  x: number,
  y: number,
) {
  const element = model.elements.find((item) => item.id === elementId);
  if (element === undefined) {
    return { x, y, width: 180, height: 72 };
  }

  if (model.kind === "object") {
    if (element.elementType === "note") {
      return { x, y, width: 120, height: 60 };
    }
    if (element.elementType === "instanceSpecification") {
      return { x, y, ...measureObjectNode(element) };
    }
  }

  if (element.elementType === "note") {
    return { x, y, width: 120, height: 60 };
  }

  if (
    element.elementType === "class" ||
    element.elementType === "interface" ||
    element.elementType === "enumeration" ||
    element.elementType === "dataType" ||
    element.elementType === "primitiveType" ||
    element.elementType === "associationClass"
  ) {
    return { x, y, ...measureClassNode(element) };
  }

  return { x, y, width: 180, height: 72 };
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
    dslEditorFocused: false,
    relationshipTool: "generalization",

    setTitle: (title) => {
      set((state) => ({
        document: {
          ...state.document,
          title,
        },
      }));
    },

    setDslEditorFocused: (focused) => {
      set({ dslEditorFocused: focused });
    },

    setRelationshipTool: (tool) => {
      set({ relationshipTool: tool });
    },

    createDocument: (kind) => {
      const document = createDocumentForKind(kind);
      set({
        document,
        diagnostics: [],
        lastGoodModel: document.model,
        lastGoodOverlay: document.overlay,
        dslRevision: 0,
        parseTimer: null,
        relationshipTool: DEFAULT_RELATIONSHIP_TOOL_BY_KIND[kind],
      });
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
      const parseResult = parse(document.kind, document.dsl);

      if (!parseResult.ok) {
        set({
          diagnostics: parseResult.error.diagnostics,
          parseTimer: null,
        });
        return;
      }

      const { ast, diagnostics: parseDiagnostics } = parseResult.value;

      if (hasFatalErrors(parseDiagnostics)) {
        set({
          diagnostics: parseDiagnostics,
          parseTimer: null,
        });
        return;
      }

      const model = astToModel(ast, lastGoodModel);
      const modelDiagnostics = validate(document.kind, model);
      const diagnostics = bindDiagnosticSpans(ast, model, [
        ...parseDiagnostics,
        ...modelDiagnostics,
      ]);

      const overlayBase = lastGoodOverlay;
      const reason =
        Object.keys(overlayBase.nodes).length === 0
          ? "first-open-empty-overlay"
          : "topology-changed";
      const overlay = await layoutDocument(document.kind, model, overlayBase, reason);

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

    updateNodePosition: (nodeId, x, y) => {
      set((state) => {
        const existing = state.document.overlay.nodes[nodeId];
        if (existing === undefined) {
          return state;
        }

        return {
          document: {
            ...state.document,
            overlay: {
              ...state.document.overlay,
              nodes: {
                ...state.document.overlay.nodes,
                [nodeId]: {
                  ...existing,
                  x,
                  y,
                },
              },
            },
          },
          lastGoodOverlay: {
            ...state.lastGoodOverlay,
            nodes: {
              ...state.lastGoodOverlay.nodes,
              [nodeId]: {
                ...existing,
                x,
                y,
              },
            },
          },
        };
      });
    },

    dropStencilElement: async (kind, x, y) => {
      const { document } = get();

      await applyModelCommand(
        get,
        set,
        (model) => {
          if (document.kind === "object") {
            switch (kind) {
              case "instance":
                return addElement(model, {
                  elementType: "instanceSpecification",
                  name: uniqueElementName(model, "instance"),
                  classifierName: "Class",
                });
              case "note":
                return addElement(model, {
                  elementType: "note",
                  name: uniqueElementName(model, "Note"),
                });
              default:
                return addElement(model, {
                  elementType: "instanceSpecification",
                  name: uniqueElementName(model, "instance"),
                  classifierName: "Class",
                });
            }
          }

          switch (kind) {
            case "class":
              return addElement(model, {
                elementType: "class",
                name: uniqueElementName(model, "Class"),
              });
            case "abstract-class":
              return addElement(model, {
                elementType: "class",
                name: uniqueElementName(model, "AbstractClass"),
                isAbstract: true,
              });
            case "interface":
              return addElement(model, {
                elementType: "interface",
                name: uniqueElementName(model, "Interface"),
              });
            case "enumeration":
              return addElement(model, {
                elementType: "enumeration",
                name: uniqueElementName(model, "Enumeration"),
                literals: [],
              });
            case "note":
              return addElement(model, {
                elementType: "note",
                name: uniqueElementName(model, "Note"),
              });
            default:
              return addElement(model, { elementType: "class", name: "Class" });
          }
        },
        (overlay, model) => {
          const elementId = model.elements.at(-1)?.id;
          if (elementId === undefined) {
            return overlay;
          }

          const measured = defaultOverlayNode(model, elementId, x, y);
          return {
            ...overlay,
            nodes: {
              ...overlay.nodes,
              [elementId]: {
                id: elementId,
                ...measured,
              },
            },
          };
        },
      );
    },

    connectElements: async (sourceId, targetId) => {
      if (!canApplyStructuralCommand(get())) {
        return;
      }

      const { document, relationshipTool } = get();
      const source = document.model.elements.find((element) => element.id === sourceId);
      const target = document.model.elements.find((element) => element.id === targetId);

      if (!source || !target) {
        return;
      }

      if (
        !isConnectorAllowed({
          kind: document.kind,
          relationship: relationshipTool,
          source: source.elementType,
          target: target.elementType,
        })
      ) {
        set({
          diagnostics: [
            {
              id: createId(),
              ruleId: ILLEGAL_CONNECTOR_RULE_ID,
              severity: "error",
              message: `Relationship "${relationshipTool}" from ${source.elementType} to ${target.elementType} is not allowed on a ${document.kind} diagram`,
              elementIds: [sourceId, targetId],
            },
          ],
        });
        return;
      }

      await applyModelCommand(get, set, (model) =>
        addRelationship(model, {
          relationshipType: relationshipTool,
          sourceId,
          targetId,
        }),
      );
    },

    deleteElements: async (elementIds) => {
      let model = get().document.model;
      for (const elementId of elementIds) {
        const result = removeElement(model, elementId);
        if (!result.ok) {
          set({
            diagnostics: [
              {
                id: createId(),
                ruleId: result.error.code,
                severity: "error",
                message: result.error.message,
                elementIds: [elementId],
              },
            ],
          });
          return;
        }
        model = result.value;
      }

      await commitStructuralModelChange(get, set, model, (overlay) => {
        const nodes = { ...overlay.nodes };
        for (const elementId of elementIds) {
          delete nodes[elementId];
        }
        return { ...overlay, nodes };
      });
    },

    deleteRelationships: async (relationshipIds) => {
      let model = get().document.model;
      for (const relationshipId of relationshipIds) {
        const result = removeRelationship(model, relationshipId);
        if (!result.ok) {
          set({
            diagnostics: [
              {
                id: createId(),
                ruleId: result.error.code,
                severity: "error",
                message: result.error.message,
                elementIds: [relationshipId],
              },
            ],
          });
          return;
        }
        model = result.value;
      }

      await commitStructuralModelChange(get, set, model);
    },

    renameSelectedElement: async (elementId, name) => {
      await applyModelCommand(get, set, (model) => renameElement(model, elementId, name));
    },

    editFirstAttribute: async (elementId, value) => {
      const trimmed = value.trim();
      const match = /^([+\-#~])?(\w+):\s*(\w+)$/.exec(trimmed);
      if (!match) {
        set({
          diagnostics: [
            {
              id: createId(),
              ruleId: "canvas.edit.invalid-attribute",
              severity: "error",
              message: 'Attribute edits must look like "+name: Type" or "-name: Type"',
              elementIds: [elementId],
            },
          ],
        });
        return;
      }

      const visibilitySymbol = match[1] ?? "+";
      const visibility =
        visibilitySymbol === "+"
          ? "public"
          : visibilitySymbol === "-"
            ? "private"
            : visibilitySymbol === "#"
              ? "protected"
              : "package";

      await applyModelCommand(get, set, (model) => {
        const element = model.elements.find((item) => item.id === elementId);
        if (element?.elementType !== "class") {
          return {
            ok: false as const,
            error: {
              code: "unknown-element" as const,
              message: "Only class elements support attribute edits in this step",
            },
          };
        }

        const attribute = element.attributes[0] ?? {
          id: createId(),
          visibility: "private" as const,
          name: "field",
          typeName: "String",
        };

        return setClassAttribute(model, elementId, attribute.id, {
          id: attribute.id,
          visibility,
          name: match[2] ?? attribute.name,
          typeName: match[3] ?? attribute.typeName,
        });
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
    dslEditorFocused: false,
    relationshipTool: "generalization",
  });
}
