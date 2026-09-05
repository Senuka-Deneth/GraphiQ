import { createId, type Diagnostic } from "@graphiq/uml-core";
import { emptyOverlay, layoutDocument, measureActivityNode, measureClassNode, measureCommunicationNode, measureComponentNode, measureCompositeStructureNode, measureDeploymentNode, measureInteractionOverviewNode, measureObjectNode, measurePackageNode, measureProfileNode, measureSequenceNode, measureStateMachineNode, measureTimingNode, measureUseCaseNode, type NotationOverlay } from "@graphiq/uml-layout";
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
import type { MessageSort, RelationshipType } from "@graphiq/uml-model";
import { parse } from "@graphiq/uml-dsl";
import { astToModel, print, synthesizeSequenceExecutionSpecs, type PrintSource } from "@graphiq/uml-print";
import { isConnectorAllowed, validate } from "@graphiq/uml-rules";
import type { Result } from "@graphiq/uml-core";
import { create } from "zustand";
import { bindDiagnosticSpans } from "../diagnostics/bindDiagnosticSpans.js";

export type ImplementedDiagramKind = "class" | "object" | "package" | "component" | "deployment" | "profile" | "useCase" | "compositeStructure" | "communication" | "activity" | "stateMachine" | "sequence" | "timing" | "interactionOverview";

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

export type PackageRelationshipTool = Extract<
  RelationshipType,
  "packageImport" | "packageMerge" | "dependency"
>;

export type ComponentRelationshipTool = Extract<
  RelationshipType,
  | "interfaceRealization"
  | "usage"
  | "assemblyConnector"
  | "delegationConnector"
  | "dependency"
>;

export type DeploymentRelationshipTool = Extract<
  RelationshipType,
  "communicationPath" | "deployment" | "generalization"
>;

export type ProfileRelationshipTool = Extract<RelationshipType, "extension" | "generalization">;

export type UseCaseRelationshipTool = Extract<
  RelationshipType,
  "association" | "include" | "extend" | "generalization"
>;

export type CompositeStructureRelationshipTool = Extract<
  RelationshipType,
  "connector" | "assemblyConnector" | "dependency"
>;

export type CommunicationRelationshipTool = Extract<RelationshipType, "message" | "link">;

export type ActivityRelationshipTool = Extract<RelationshipType, "controlFlow" | "objectFlow">;

export type StateMachineRelationshipTool = Extract<RelationshipType, "transition">;

export type SequenceRelationshipTool = Extract<
  MessageSort,
  "synchCall" | "asynchCall" | "reply" | "createMessage"
>;

export type TimingRelationshipTool = SequenceRelationshipTool;

export type InteractionOverviewRelationshipTool = Extract<RelationshipType, "controlFlow">;

export type RelationshipTool =
  | ClassRelationshipTool
  | ObjectRelationshipTool
  | PackageRelationshipTool
  | ComponentRelationshipTool
  | DeploymentRelationshipTool
  | ProfileRelationshipTool
  | UseCaseRelationshipTool
  | CompositeStructureRelationshipTool
  | CommunicationRelationshipTool
  | ActivityRelationshipTool
  | StateMachineRelationshipTool
  | SequenceRelationshipTool
  | TimingRelationshipTool
  | InteractionOverviewRelationshipTool;

export type ClassStencilDropKind =
  | "class"
  | "interface"
  | "enumeration"
  | "abstract-class"
  | "note";

export type ObjectStencilDropKind = "instance" | "note";

export type PackageStencilDropKind =
  | "package"
  | "class"
  | "interface"
  | "enumeration"
  | "note";

export type ComponentStencilDropKind =
  | "component"
  | "interface"
  | "port"
  | "artifact"
  | "note";

export type DeploymentStencilDropKind =
  | "node"
  | "device"
  | "executionEnvironment"
  | "artifact"
  | "note";

export type ProfileStencilDropKind =
  | "stereotype"
  | "metaclass"
  | "enumeration"
  | "profile"
  | "note";

export type UseCaseStencilDropKind = "actor" | "useCase" | "subject" | "note";

export type CompositeStructureStencilDropKind = "class" | "part" | "port" | "note";

export type CommunicationStencilDropKind = "instance" | "note";

export type ActivityStencilDropKind =
  | "action"
  | "objectNode"
  | "initialNode"
  | "activityFinalNode"
  | "flowFinalNode"
  | "decisionNode"
  | "mergeNode"
  | "forkNode"
  | "joinNode"
  | "activityPartition"
  | "note";

export type StateMachineStencilDropKind =
  | "state"
  | "initial"
  | "final"
  | "choice"
  | "fork"
  | "join"
  | "note";

export type SequenceStencilDropKind = "lifeline" | "combined-fragment" | "note";

export type TimingStencilDropKind = "lifeline" | "note";

export type InteractionOverviewStencilDropKind =
  | "interactionUse"
  | "initialNode"
  | "activityFinalNode"
  | "decisionNode"
  | "mergeNode"
  | "forkNode"
  | "joinNode"
  | "note";

export type StencilDropKind =
  | ClassStencilDropKind
  | ObjectStencilDropKind
  | PackageStencilDropKind
  | ComponentStencilDropKind
  | DeploymentStencilDropKind
  | ProfileStencilDropKind
  | UseCaseStencilDropKind
  | CompositeStructureStencilDropKind
  | CommunicationStencilDropKind
  | ActivityStencilDropKind
  | StateMachineStencilDropKind
  | SequenceStencilDropKind
  | TimingStencilDropKind
  | InteractionOverviewStencilDropKind;

type DocumentStoreState = {
  document: GraphiqDocument;
  diagnostics: Diagnostic[];
  lastGoodModel: UmlModel;
  lastGoodOverlay: NotationOverlay;
  lastParseSource: PrintSource | null;
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
  connectElements: (
    sourceId: string,
    targetId: string,
    options?: { time?: number },
  ) => Promise<void>;
  deleteElements: (elementIds: readonly string[]) => Promise<void>;
  deleteRelationships: (relationshipIds: readonly string[]) => Promise<void>;
  renameSelectedElement: (elementId: string, name: string) => Promise<void>;
  editFirstAttribute: (elementId: string, value: string) => Promise<void>;
};

const INITIAL_DSL_BY_KIND: Record<ImplementedDiagramKind, string> = {
  class: "diagram class\n",
  object: "diagram object\n",
  package: "diagram package\n",
  component: "diagram component\n",
  deployment: "diagram deployment\n",
  profile: "diagram profile\n",
  useCase: "diagram useCase\n",
  compositeStructure: "diagram compositeStructure\n",
  communication: "diagram communication\n",
  activity: "diagram activity\n",
  stateMachine: "diagram stateMachine\n",
  sequence: "diagram sequence\n",
  timing: "diagram timing\n",
  interactionOverview: "diagram interactionOverview\n",
};

const DEFAULT_TITLE_BY_KIND: Record<ImplementedDiagramKind, string> = {
  class: "Untitled class diagram",
  object: "Untitled object diagram",
  package: "Untitled package diagram",
  component: "Untitled component diagram",
  deployment: "Untitled deployment diagram",
  profile: "Untitled profile diagram",
  useCase: "Untitled use case diagram",
  compositeStructure: "Untitled composite structure diagram",
  communication: "Untitled communication diagram",
  activity: "Untitled activity diagram",
  stateMachine: "Untitled state machine diagram",
  sequence: "Untitled sequence diagram",
  timing: "Untitled timing diagram",
  interactionOverview: "Untitled interaction overview diagram",
};

const DEFAULT_RELATIONSHIP_TOOL_BY_KIND: Record<ImplementedDiagramKind, RelationshipTool> = {
  class: "generalization",
  object: "link",
  package: "packageImport",
  component: "assemblyConnector",
  deployment: "communicationPath",
  profile: "extension",
  useCase: "association",
  compositeStructure: "connector",
  communication: "message",
  activity: "controlFlow",
  stateMachine: "transition",
  sequence: "synchCall",
  timing: "synchCall",
  interactionOverview: "controlFlow",
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

function findActivityPartitionAtPoint(
  model: UmlModel,
  overlay: NotationOverlay,
  x: number,
  y: number,
): { parentId: string; x: number; y: number } | undefined {
  let match: { parentId: string; x: number; y: number; area: number } | undefined;

  for (const element of model.elements) {
    if (element.elementType !== "activityPartition") {
      continue;
    }
    const box = overlay.nodes[element.id];
    if (box === undefined) {
      continue;
    }
    if (x >= box.x && x <= box.x + box.width && y >= box.y && y <= box.y + box.height) {
      const area = box.width * box.height;
      if (match === undefined || area < match.area) {
        match = {
          parentId: element.id,
          x: x - box.x,
          y: y - box.y,
          area,
        };
      }
    }
  }

  if (match === undefined) {
    return undefined;
  }
  return { parentId: match.parentId, x: match.x, y: match.y };
}

function absoluteOverlayBox(
  model: UmlModel,
  overlay: NotationOverlay,
  elementId: string,
): { x: number; y: number; width: number; height: number } | undefined {
  const node = overlay.nodes[elementId];
  if (node === undefined) {
    return undefined;
  }

  const element = model.elements.find((item) => item.id === elementId);
  if (element?.parentId === undefined) {
    return node;
  }

  const parentBox = absoluteOverlayBox(model, overlay, element.parentId);
  if (parentBox === undefined) {
    return node;
  }

  return {
    x: parentBox.x + node.x,
    y: parentBox.y + node.y,
    width: node.width,
    height: node.height,
  };
}

function findStateMachineContainerAtPoint(
  model: UmlModel,
  overlay: NotationOverlay,
  x: number,
  y: number,
): { parentId: string; x: number; y: number } | undefined {
  let match: { parentId: string; x: number; y: number; area: number } | undefined;

  for (const element of model.elements) {
    if (element.elementType !== "region") {
      continue;
    }

    const box = absoluteOverlayBox(model, overlay, element.id);
    if (box === undefined) {
      continue;
    }

    if (x >= box.x && x <= box.x + box.width && y >= box.y && y <= box.y + box.height) {
      const area = box.width * box.height;
      if (match === undefined || area < match.area) {
        match = {
          parentId: element.id,
          x: x - box.x,
          y: y - box.y,
          area,
        };
      }
    }
  }

  if (match !== undefined) {
    return { parentId: match.parentId, x: match.x, y: match.y };
  }

  for (const element of model.elements) {
    if (element.elementType !== "state") {
      continue;
    }

    const hasRegion = model.elements.some(
      (child) => child.parentId === element.id && child.elementType === "region",
    );
    if (!hasRegion) {
      continue;
    }

    const box = absoluteOverlayBox(model, overlay, element.id);
    if (box === undefined) {
      continue;
    }

    if (x >= box.x && x <= box.x + box.width && y >= box.y && y <= box.y + box.height) {
      const region = model.elements.find(
        (child) => child.parentId === element.id && child.elementType === "region",
      );
      if (region === undefined) {
        continue;
      }

      const regionBox = absoluteOverlayBox(model, overlay, region.id);
      if (regionBox === undefined) {
        continue;
      }

      const area = box.width * box.height;
      if (match === undefined || area < match.area) {
        match = {
          parentId: region.id,
          x: x - regionBox.x,
          y: y - regionBox.y,
          area,
        };
      }
    }
  }

  if (match === undefined) {
    return undefined;
  }
  return { parentId: match.parentId, x: match.x, y: match.y };
}

function printDocumentDsl(
  document: GraphiqDocument,
  model: UmlModel,
  source: PrintSource | null,
): string {
  const defaultTitle = DEFAULT_TITLE_BY_KIND[document.kind];
  const title =
    document.title.trim().length > 0 && document.title !== defaultTitle
      ? document.title
      : undefined;
  return print(document.kind, model, { name: title, source: source ?? undefined });
}

function refreshParseSource(
  kind: ImplementedDiagramKind,
  dsl: string,
): PrintSource | null {
  const parseResult = parse(kind, dsl);
  if (!parseResult.ok) {
    return null;
  }
  return {
    text: dsl,
    ast: parseResult.value.ast,
    comments: parseResult.value.comments,
  };
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
  const { document, lastGoodOverlay, lastParseSource } = get();
  const modelForValidation =
    document.kind === "sequence"
      ? synthesizeSequenceExecutionSpecs(nextModel, get().lastGoodModel)
      : nextModel;
  const diagnostics = validate(document.kind, modelForValidation);

  if (hasFatalErrors(diagnostics)) {
    set({ diagnostics });
    return false;
  }

  const overlayBase = overlayPatch ? overlayPatch(lastGoodOverlay, modelForValidation) : lastGoodOverlay;
  const reason =
    Object.keys(overlayBase.nodes).length === 0
      ? "first-open-empty-overlay"
      : "topology-changed";
  const overlay = await layoutDocument(document.kind, modelForValidation, overlayBase, reason);
  const dsl = printDocumentDsl(document, modelForValidation, lastParseSource);
  const nextParseSource = refreshParseSource(document.kind, dsl);

  set((state) => ({
    document: {
      ...state.document,
      model: modelForValidation,
      overlay,
      dsl,
    },
    lastGoodModel: modelForValidation,
    lastGoodOverlay: overlay,
    lastParseSource: nextParseSource,
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

function nextCommunicationSequenceNumber(model: UmlModel): string {
  const used = new Set(
    model.relationships
      .filter((relationship) => relationship.relationshipType === "message")
      .map((relationship) => relationship.sequenceNumber)
      .filter((value): value is string => value !== undefined),
  );

  let candidate = 1;
  while (used.has(String(candidate))) {
    candidate += 1;
  }
  return String(candidate);
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

  if (model.kind === "package") {
    return { x, y, ...measurePackageNode(element) };
  }

  if (model.kind === "component") {
    return { x, y, ...measureComponentNode(element) };
  }

  if (model.kind === "deployment") {
    return { x, y, ...measureDeploymentNode(element) };
  }

  if (model.kind === "profile") {
    return { x, y, ...measureProfileNode(element) };
  }

  if (model.kind === "useCase") {
    return { x, y, ...measureUseCaseNode(element) };
  }

  if (model.kind === "compositeStructure") {
    return { x, y, ...measureCompositeStructureNode(element) };
  }

  if (model.kind === "communication") {
    return { x, y, ...measureCommunicationNode(element) };
  }

  if (model.kind === "activity") {
    return { x, y, ...measureActivityNode(element) };
  }

  if (model.kind === "stateMachine") {
    return { x, y, ...measureStateMachineNode(element) };
  }

  if (model.kind === "sequence") {
    return { x, y, ...measureSequenceNode(element) };
  }

  if (model.kind === "timing") {
    return { x, y, ...measureTimingNode(element) };
  }

  if (model.kind === "interactionOverview") {
    return { x, y, ...measureInteractionOverviewNode(element) };
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
  const initialParseSource = refreshParseSource(initialDocument.kind, initialDocument.dsl);

  return {
    document: initialDocument,
    diagnostics: [],
    lastGoodModel: initialDocument.model,
    lastGoodOverlay: initialDocument.overlay,
    lastParseSource: initialParseSource,
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
        lastParseSource: refreshParseSource(kind, document.dsl),
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

      const { ast, diagnostics: parseDiagnostics, comments } = parseResult.value;

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
        lastParseSource: {
          text: document.dsl,
          ast,
          comments,
        },
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
      let dropX = x;
      let dropY = y;
      let activityParentId: string | undefined;
      let stateMachineParentId: string | undefined;

      if (document.kind === "activity" && kind !== "activityPartition") {
        const hit = findActivityPartitionAtPoint(document.model, document.overlay, x, y);
        if (hit !== undefined) {
          activityParentId = hit.parentId;
          dropX = hit.x;
          dropY = hit.y;
        }
      }

      if (document.kind === "stateMachine") {
        const hit = findStateMachineContainerAtPoint(document.model, document.overlay, x, y);
        if (hit !== undefined) {
          stateMachineParentId = hit.parentId;
          dropX = hit.x;
          dropY = hit.y;
        }
      }

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

          if (document.kind === "package") {
            switch (kind) {
              case "package":
                return addElement(model, {
                  elementType: "package",
                  name: uniqueElementName(model, "Package"),
                });
              case "class":
                return addElement(model, {
                  elementType: "class",
                  name: uniqueElementName(model, "Class"),
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
                return addElement(model, {
                  elementType: "package",
                  name: uniqueElementName(model, "Package"),
                });
            }
          }

          if (document.kind === "component") {
            switch (kind) {
              case "component":
                return addElement(model, {
                  elementType: "component",
                  name: uniqueElementName(model, "Component"),
                });
              case "interface":
                return addElement(model, {
                  elementType: "interface",
                  name: uniqueElementName(model, "Interface"),
                });
              case "port":
                return addElement(model, {
                  elementType: "port",
                  name: uniqueElementName(model, "Port"),
                });
              case "artifact":
                return addElement(model, {
                  elementType: "artifact",
                  name: uniqueElementName(model, "Artifact"),
                });
              case "note":
                return addElement(model, {
                  elementType: "note",
                  name: uniqueElementName(model, "Note"),
                });
              default:
                return addElement(model, {
                  elementType: "component",
                  name: uniqueElementName(model, "Component"),
                });
            }
          }

          if (document.kind === "deployment") {
            switch (kind) {
              case "node":
                return addElement(model, {
                  elementType: "node",
                  name: uniqueElementName(model, "Node"),
                });
              case "device":
                return addElement(model, {
                  elementType: "device",
                  name: uniqueElementName(model, "Device"),
                });
              case "executionEnvironment":
                return addElement(model, {
                  elementType: "executionEnvironment",
                  name: uniqueElementName(model, "ExecutionEnvironment"),
                });
              case "artifact":
                return addElement(model, {
                  elementType: "artifact",
                  name: uniqueElementName(model, "Artifact"),
                });
              case "note":
                return addElement(model, {
                  elementType: "note",
                  name: uniqueElementName(model, "Note"),
                });
              default:
                return addElement(model, {
                  elementType: "node",
                  name: uniqueElementName(model, "Node"),
                });
            }
          }

          if (document.kind === "profile") {
            switch (kind) {
              case "stereotype":
                return addElement(model, {
                  elementType: "stereotype",
                  name: uniqueElementName(model, "Stereotype"),
                });
              case "metaclass":
                return addElement(model, {
                  elementType: "metaclass",
                  name: uniqueElementName(model, "Metaclass"),
                });
              case "enumeration":
                return addElement(model, {
                  elementType: "enumeration",
                  name: uniqueElementName(model, "Enumeration"),
                  literals: [],
                });
              case "profile":
                return addElement(model, {
                  elementType: "profile",
                  name: uniqueElementName(model, "Profile"),
                });
              case "note":
                return addElement(model, {
                  elementType: "note",
                  name: uniqueElementName(model, "Note"),
                });
              default:
                return addElement(model, {
                  elementType: "stereotype",
                  name: uniqueElementName(model, "Stereotype"),
                });
            }
          }

          if (document.kind === "useCase") {
            const singleSubject = model.elements.find(
              (element) => element.elementType === "subject" && element.parentId === undefined,
            );

            switch (kind) {
              case "actor":
                return addElement(model, {
                  elementType: "actor",
                  name: uniqueElementName(model, "Actor"),
                });
              case "useCase":
                return addElement(model, {
                  elementType: "useCase",
                  name: uniqueElementName(model, "UseCase"),
                  ...(singleSubject !== undefined ? { parentId: singleSubject.id } : {}),
                });
              case "subject":
                return addElement(model, {
                  elementType: "subject",
                  name: uniqueElementName(model, "Subject"),
                });
              case "note":
                return addElement(model, {
                  elementType: "note",
                  name: uniqueElementName(model, "Note"),
                });
              default:
                return addElement(model, {
                  elementType: "actor",
                  name: uniqueElementName(model, "Actor"),
                });
            }
          }

          if (document.kind === "compositeStructure") {
            const encapsulatingFrame = model.elements.find(
              (element) =>
                (element.elementType === "class" || element.elementType === "component") &&
                element.parentId === undefined,
            );

            switch (kind) {
              case "class":
                return addElement(model, {
                  elementType: "class",
                  name: uniqueElementName(model, "Class"),
                  isAbstract: false,
                  attributes: [],
                  operations: [],
                });
              case "part":
                return addElement(model, {
                  elementType: "part",
                  name: uniqueElementName(model, "Part"),
                  typeName: "Type",
                  ...(encapsulatingFrame !== undefined
                    ? { parentId: encapsulatingFrame.id }
                    : {}),
                });
              case "port":
                return addElement(model, {
                  elementType: "port",
                  name: uniqueElementName(model, "Port"),
                  ...(encapsulatingFrame !== undefined
                    ? { parentId: encapsulatingFrame.id }
                    : {}),
                });
              case "note":
                return addElement(model, {
                  elementType: "note",
                  name: uniqueElementName(model, "Note"),
                });
              default:
                return addElement(model, {
                  elementType: "class",
                  name: uniqueElementName(model, "Class"),
                  isAbstract: false,
                  attributes: [],
                  operations: [],
                });
            }
          }

          if (document.kind === "communication") {
            switch (kind) {
              case "instance":
                return addElement(model, {
                  elementType: "instanceSpecification",
                  name: uniqueElementName(model, "Instance"),
                  classifierName: "Type",
                });
              case "note":
                return addElement(model, {
                  elementType: "note",
                  name: uniqueElementName(model, "Note"),
                });
              default:
                return addElement(model, {
                  elementType: "instanceSpecification",
                  name: uniqueElementName(model, "Instance"),
                  classifierName: "Type",
                });
            }
          }

          if (document.kind === "activity") {
            const parent =
              activityParentId !== undefined ? { parentId: activityParentId } : {};
            switch (kind) {
              case "action":
                return addElement(model, {
                  elementType: "action",
                  name: uniqueElementName(model, "Action"),
                  ...parent,
                });
              case "objectNode":
                return addElement(model, {
                  elementType: "objectNode",
                  name: uniqueElementName(model, "Object"),
                  ...parent,
                });
              case "initialNode":
                return addElement(model, {
                  elementType: "initialNode",
                  name: uniqueElementName(model, "initial"),
                  ...parent,
                });
              case "activityFinalNode":
                return addElement(model, {
                  elementType: "activityFinalNode",
                  name: uniqueElementName(model, "final"),
                  ...parent,
                });
              case "flowFinalNode":
                return addElement(model, {
                  elementType: "flowFinalNode",
                  name: uniqueElementName(model, "flowFinal"),
                  ...parent,
                });
              case "decisionNode":
                return addElement(model, {
                  elementType: "decisionNode",
                  name: uniqueElementName(model, "decision"),
                  ...parent,
                });
              case "mergeNode":
                return addElement(model, {
                  elementType: "mergeNode",
                  name: uniqueElementName(model, "merge"),
                  ...parent,
                });
              case "forkNode":
                return addElement(model, {
                  elementType: "forkNode",
                  name: uniqueElementName(model, "fork"),
                  ...parent,
                });
              case "joinNode":
                return addElement(model, {
                  elementType: "joinNode",
                  name: uniqueElementName(model, "join"),
                  ...parent,
                });
              case "activityPartition":
                return addElement(model, {
                  elementType: "activityPartition",
                  name: uniqueElementName(model, "Partition"),
                });
              case "note":
                return addElement(model, {
                  elementType: "note",
                  name: uniqueElementName(model, "Note"),
                  ...parent,
                });
              default:
                return addElement(model, {
                  elementType: "action",
                  name: uniqueElementName(model, "Action"),
                  ...parent,
                });
            }
          }

          if (document.kind === "stateMachine") {
            const parent =
              stateMachineParentId !== undefined ? { parentId: stateMachineParentId } : {};
            switch (kind) {
              case "state":
                return addElement(model, {
                  elementType: "state",
                  name: uniqueElementName(model, "State"),
                  ...parent,
                });
              case "initial":
                return addElement(model, {
                  elementType: "pseudostate",
                  name: "[*]",
                  kind: "initial",
                  ...parent,
                });
              case "final":
                return addElement(model, {
                  elementType: "finalState",
                  name: "[*]",
                  ...parent,
                });
              case "choice":
                return addElement(model, {
                  elementType: "pseudostate",
                  name: uniqueElementName(model, "Choice"),
                  kind: "choice",
                  ...parent,
                });
              case "fork":
                return addElement(model, {
                  elementType: "pseudostate",
                  name: uniqueElementName(model, "Fork"),
                  kind: "fork",
                  ...parent,
                });
              case "join":
                return addElement(model, {
                  elementType: "pseudostate",
                  name: uniqueElementName(model, "Join"),
                  kind: "join",
                  ...parent,
                });
              case "note":
                return addElement(model, {
                  elementType: "note",
                  name: uniqueElementName(model, "Note"),
                  ...parent,
                });
              default:
                return addElement(model, {
                  elementType: "state",
                  name: uniqueElementName(model, "State"),
                  ...parent,
                });
            }
          }

          if (document.kind === "sequence") {
            switch (kind) {
              case "lifeline":
                return addElement(model, {
                  elementType: "lifeline",
                  name: uniqueElementName(model, "lifeline"),
                  classifierName: "Type",
                });
              case "combined-fragment":
                return addElement(model, {
                  elementType: "combinedFragment",
                  name: uniqueElementName(model, "alt"),
                  operator: "alt",
                  operands: [{ messageIds: [] }],
                });
              case "note":
                return addElement(model, {
                  elementType: "note",
                  name: uniqueElementName(model, "Note"),
                });
              default:
                return addElement(model, {
                  elementType: "lifeline",
                  name: uniqueElementName(model, "lifeline"),
                });
            }
          }

          if (document.kind === "timing") {
            switch (kind) {
              case "lifeline":
                return addElement(model, {
                  elementType: "lifeline",
                  name: uniqueElementName(model, "lifeline"),
                  classifierName: "Type",
                });
              case "note":
                return addElement(model, {
                  elementType: "note",
                  name: uniqueElementName(model, "Note"),
                });
              default:
                return addElement(model, {
                  elementType: "lifeline",
                  name: uniqueElementName(model, "lifeline"),
                });
            }
          }

          if (document.kind === "interactionOverview") {
            switch (kind) {
              case "interactionUse":
                return addElement(model, {
                  elementType: "interactionUse",
                  name: uniqueElementName(model, "Interaction"),
                });
              case "initialNode":
                return addElement(model, {
                  elementType: "initialNode",
                  name: uniqueElementName(model, "initial"),
                });
              case "activityFinalNode":
                return addElement(model, {
                  elementType: "activityFinalNode",
                  name: uniqueElementName(model, "final"),
                });
              case "decisionNode":
                return addElement(model, {
                  elementType: "decisionNode",
                  name: uniqueElementName(model, "decision"),
                });
              case "mergeNode":
                return addElement(model, {
                  elementType: "mergeNode",
                  name: uniqueElementName(model, "merge"),
                });
              case "forkNode":
                return addElement(model, {
                  elementType: "forkNode",
                  name: uniqueElementName(model, "fork"),
                });
              case "joinNode":
                return addElement(model, {
                  elementType: "joinNode",
                  name: uniqueElementName(model, "join"),
                });
              case "note":
                return addElement(model, {
                  elementType: "note",
                  name: uniqueElementName(model, "Note"),
                });
              default:
                return addElement(model, {
                  elementType: "interactionUse",
                  name: uniqueElementName(model, "Interaction"),
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

          const measured = defaultOverlayNode(model, elementId, dropX, dropY);
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

    connectElements: async (sourceId, targetId, options) => {
      if (!canApplyStructuralCommand(get())) {
        return;
      }

      const { document, relationshipTool } = get();
      const source = document.model.elements.find((element) => element.id === sourceId);
      const target = document.model.elements.find((element) => element.id === targetId);

      if (!source || !target) {
        return;
      }

      const connectorRelationship = (
        document.kind === "sequence" || document.kind === "timing"
          ? "message"
          : relationshipTool
      ) as RelationshipType;

      if (
        !isConnectorAllowed({
          kind: document.kind,
          relationship: connectorRelationship,
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
              message: `Relationship "${connectorRelationship}" from ${source.elementType} to ${target.elementType} is not allowed on a ${document.kind} diagram`,
              elementIds: [sourceId, targetId],
            },
          ],
        });
        return;
      }

      await applyModelCommand(get, set, (model) => {
        if (document.kind === "communication" && relationshipTool === "message") {
          return addRelationship(model, {
            relationshipType: "message",
            sourceId,
            targetId,
            messageSort: "synchCall",
            sequenceNumber: nextCommunicationSequenceNumber(model),
          });
        }

        if (document.kind === "sequence") {
          return addRelationship(model, {
            relationshipType: "message",
            sourceId,
            targetId,
            messageSort: relationshipTool as SequenceRelationshipTool,
          });
        }

        if (document.kind === "timing") {
          return addRelationship(model, {
            relationshipType: "message",
            sourceId,
            targetId,
            messageSort: relationshipTool as TimingRelationshipTool,
            time: options?.time ?? 0,
          });
        }

        return addRelationship(model, {
          relationshipType: relationshipTool as Exclude<
            RelationshipTool,
            "message" | SequenceRelationshipTool
          >,
          sourceId,
          targetId,
        });
      });
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
    lastParseSource: refreshParseSource(initialDocument.kind, initialDocument.dsl),
    dslRevision: 0,
    parseTimer: null,
    dslEditorFocused: false,
    relationshipTool: "generalization",
  });
}
