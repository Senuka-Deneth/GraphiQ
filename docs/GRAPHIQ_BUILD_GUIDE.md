# GraphiQ Build Guide

GraphiQ is a local-first UML modeling web app: a Lucidchart-style interactive canvas plus a Notion-style text-to-diagram panel. The product is **UML 2.5.1 notation and well-formedness**, not a general drawing tool and not a PlantUML clone.

This file is the architecture bible and the **agent operating checklist**. Implement up to the next three incomplete checklist steps per session. Finish each step completely before starting the next. Do not skip ahead. Do not invent a fifteenth diagram kind. Do not replace the locked stack.

## How agents must work

| Role | Model |
|---|---|
| Plan the next step | Grok 4.6 Extra High |
| Build the next step | Composer 2.5 |
| Step marked **Escalate** | Stop before coding. Tell the user this step needs Grok 4.6 Extra High (raise thinking if the step still fails). Do not implement an Escalate step on Composer 2.5. |

After every step: run the step’s verification, re-read the full diff, fix every issue, re-run verification, then commit on `dev` as Senuka Deneth and push `dev` to `origin`. Follow `.cursor/rules/graphiq-agent.mdc`.

---

## 1. Product definition

### 1.1 What GraphiQ is

- One browser app that edits **one GraphiQ document** at a time in v1.
- A document is one UML diagram kind, one semantic model, one notation overlay, and one DSL buffer.
- Users can type GraphiQ DSL (text → diagram) or draw on the canvas (diagram → model → text).
- Every shape, line, and arrowhead follows **OMG UML 2.5.1** notation.
- Illegal UML is blocked or diagnosed. The canvas never “just draws a line.”

### 1.2 What GraphiQ is not (v1)

- Not the full Eclipse UML2 / MOF / XMI stack.
- Not PlantUML or Mermaid compatibility in the core parser.
- Not SysML.
- Not real-time collaboration.
- Not code generation from models.
- Not a hosted multi-user backend.
- Not a generic flowchart product with UML stickers.

PlantUML and Mermaid importers, a shared project model across diagrams, XMI, and accounts are later phases. Types and IDs must not block those phases.

### 1.3 Use cases

1. **Text-to-diagram.** A student pastes a class DSL into the side panel and gets a standards-correct class diagram with hierarchical layout.
2. **Canvas modeling.** An engineer drags a Class from the stencil, names it, adds attributes in the compartment, and draws a composition to another class. The DSL updates. The composition uses a filled diamond.
3. **Illegal-by-construction.** Connecting an Actor to a Device with Generalization is rejected with a rule id and a short explanation.
4. **Diagnostics.** Parse errors underline the DSL. Rule violations mark the offending edge or node. Nothing is dropped silently.
5. **Round-trip with layout isolation.** Adding `+total(): Money` in text updates the class box. Adding a private attribute on the canvas reprints the DSL. Dragging the box does **not** change the DSL.
6. **Kind-correct notation.** Generalization is a solid line and a hollow closed triangle. Realization is dashed with the same triangle. Sequence synchronous call is a solid filled arrowhead. Reply is dashed open.
7. **Local save.** The user reloads the tab and the last document is restored from IndexedDB. Export to SVG/PNG exists after the editor works.
8. **DSL guide download and import.** The user downloads a Markdown GraphiQ DSL guide, gives it to a person or an LLM, then types or uploads the returned `diagram <kind>` code to generate any of the 14 kinds.

---

## 2. Locked technology stack

Do not substitute these without a documented architecture change committed as its own step.

| Layer | Choice | Why | Reject |
|---|---|---|---|
| Runtime | Node 22 LTS, `pnpm` workspaces | Fast, strict, agent-friendly packages | npm/yarn as the workspace tool; a single `src/` app |
| App | Vite + React 19 + TypeScript (strict) | Canvas, CodeMirror, and ELK workers fight SSR | Next.js App Router for the editor |
| Packages | See §4 | Agents can test a package without the UI | One mega-bundle of types + UI |
| Structure canvas | `@xyflow/react` (XYFlow) + custom SVG nodes and markers | Zoom, pan, selection, ports, custom HTML/SVG nodes | Hand-rolled `<canvas>`; JointJS as the core |
| Sequence / timing / swimlane canvas | Dedicated SVG engines behind the same chrome | Those geometries are not node-edge graphs | ELK layered + XYFlow for lifelines or timing rulers |
| Graph layout | `elkjs` in a Web Worker | Layered, box, mrtree, orthogonal routing | Dagre as primary |
| Sequence / timing / activity partitions | Deterministic custom layout in `uml-layout` | UML notation is coordinate-specific | Force-directed UML |
| Parser | Chevrotain | TypeScript, CST, error recovery | Peggy; wrapping PlantUML |
| Printer | `uml-print` from model, format-preserving when CST exists | Canvas edits must not thrash whitespace | Full-file regen on every mouse move |
| Text editor | CodeMirror 6 | Bundle size and split-pane fit | Monaco in v1 |
| State | Zustand; model updates are pure functions | Testable without React | XYFlow node arrays as source of truth |
| Rules | Registry + per-kind connector matrix | Exhaustive, testable, UI-free | `if` checks inside drag handlers |
| Persist v1 | Dexie / IndexedDB | Local-first | Cloud, auth, or a database until the editor works |
| Style | Tailwind CSS + CSS variables for notation colors | Dense editor chrome | Component CSS-in-JS as the design system |
| Unit/integration tests | Vitest | Same-process, fast, per-package | Jest |
| Editor smoke | Playwright against `pnpm --filter @graphiq/web dev` | Real chrome, real layout | Pixel snapshots as the only test |

TypeScript rules that apply everywhere:

- Discriminated unions for elements, relationships, diagnostics, and diagram kinds.
- Every `switch` on those unions has a `default` with a `never` check.
- No `any`. No inline imports except a documented circular-dependency break.
- Public package APIs are explicit; do not reach into another package’s `src/` internals.

---

## 3. Architecture

### 3.1 Source of truth

The **semantic UML model** is the source of truth.

| Artifact | Role |
|---|---|
| `UmlModel` | Elements, relationships, properties, multiplicities, messages. Identified by UUID. |
| `NotationOverlay` | Per-element `x, y, width, height`, edge waypoints, viewport. Not UML semantics. |
| DSL text | A view of `UmlModel` for the active diagram. |
| Canvas | A view of `UmlModel` plus `NotationOverlay`. |

Dragging, resizing, and rerouting update **only** `NotationOverlay`.

Creating, deleting, renaming, changing compartments, changing multiplicities, and changing relationship kinds update `UmlModel`, then reprint DSL, then may relayout **new or unpositioned** elements only.

### 3.2 Data flow

```
CodeMirror  --parse-->  CST/AST  --patch-->  UmlModel
Canvas ops  --command-->  UmlModel and/or NotationOverlay

UmlModel  --validate-->  Diagnostic[]
UmlModel + Overlay  --layout router-->  NotationOverlay (partial)
UmlModel + Overlay  --kind renderer-->  Canvas
UmlModel (+ CST)  --print-->  DSL text
```

Never write coordinates into the DSL. Never store UML properties only inside XYFlow `data`.

### 3.3 Document shape (v1)

```ts
type GraphiqDocument = {
  id: string;
  kind: DiagramKind;
  title: string;
  model: UmlModel;
  overlay: NotationOverlay;
  dsl: string;
};
```

v1 is **one diagram per document**. Element UUIDs must remain stable so a later project-level shared model can attach the same Class to a class diagram and a sequence lifeline.

### 3.4 Layout router

`layoutDocument(kind, model, overlay, reason)` chooses an engine. If a kind is wired to the wrong engine, **throw**. Do not fall back to layered ELK.

| Kind | Engine |
|---|---|
| class, object, component, deployment, profile, communication | `elkjs` (`elk.layered` or `elk.stress` as specified per kind) |
| package, compositeStructure | `elkjs` hierarchy (`elk.mrtree` / `elk.box`) plus containment |
| useCase | custom system-boundary pack + `elk.layered` for leftover edges |
| activity | custom partitions (swimlanes) + `elk.layered` inside a lane |
| stateMachine | `elk.layered` with nested graphs for composite states |
| sequence | custom sequence engine |
| timing | custom timing engine |
| interactionOverview | activity-like layered layout with interaction-use nodes |

Relayout reasons:

- `topology-changed`: new or deleted elements/relationships.
- `user-auto-layout`: explicit button.
- `first-open-empty-overlay`: missing positions.

Do not relayout every keystroke. Preserve overlay entries whose ids still exist.

### 3.5 Bidirectional sync protocol

**Text → model**

1. Debounce 150ms.
2. Parse with Chevrotain. On fatal parse error: keep last good model, publish parse diagnostics, do not wipe the canvas.
3. On success: diff AST against model by stable identifiers (explicit `id` in DSL if present, else qualified name within kind).
4. Patch model (add/update/remove).
5. Run rules. Publish model diagnostics.
6. For new ids with no overlay, run layout for those nodes only.
7. Do not reprint the buffer the user is still typing into.

**Canvas → model → text**

1. Position changes: overlay only.
2. Structural commands (`addClass`, `setAttribute`, `connect`, `delete`): pure model functions.
3. Reject illegal connects before mutating (matrix check). If a command still produces diagnostics of severity `error`, keep the previous model.
4. Reprint DSL with `uml-print`. If a CST from the last successful parse exists, preserve comments and unaffected whitespace.
5. Replace the CodeMirror document in one transaction; restore cursor if the edit is a bounded reprint.

**Conflict rule:** the latest completed command wins. While the user is typing, canvas structural edits wait until parse succeeds or the user blurs the editor.

### 3.6 Identity

- Every element and relationship has a UUID created at insert time.
- DSL may omit ids. The printer may emit ids only when needed for disambiguation (duplicate names).
- Renames keep the UUID. Overlay keys are UUIDs, not names.

---

## 4. Monorepo map

```
GraphiQ/
  package.json
  pnpm-workspace.yaml
  tsconfig.base.json
  apps/web/                  @graphiq/web
  packages/uml-core/         @graphiq/uml-core
  packages/uml-model/        @graphiq/uml-model
  packages/uml-notation/     @graphiq/uml-notation
  packages/uml-rules/        @graphiq/uml-rules
  packages/uml-dsl/          @graphiq/uml-dsl
  packages/uml-print/        @graphiq/uml-print
  packages/uml-layout/       @graphiq/uml-layout
  docs/GRAPHIQ_BUILD_GUIDE.md
  .cursor/rules/graphiq-agent.mdc
```

| Package | Responsibility | Must not contain |
|---|---|---|
| `uml-core` | `DiagramKind`, UUID helpers, `Diagnostic`, `Result`, shared branded types | React, Chevrotain, ELK |
| `uml-model` | Element/relationship types for all 14 kinds, empty-model factories, command functions | Parser, SVG, XYFlow |
| `uml-notation` | Shape specs, line style, arrowheads, compartment layout numbers | Rule predicates, parser |
| `uml-rules` | Rule registry, connector matrices, `validate(kind, model)` | UI |
| `uml-dsl` | Chevrotain tokens, parsers per kind, AST types | React |
| `uml-print` | Model (+ optional CST) → DSL string | Canvas |
| `uml-layout` | ELK worker wrapper, layout router, custom sequence/timing/activity engines | React components |
| `@graphiq/web` | Vite app, XYFlow, custom canvases, CodeMirror, Zustand, Dexie, Playwright | UML rule implementations |

Package dependency direction:

```
web → uml-layout, uml-print, uml-dsl, uml-rules, uml-notation, uml-model, uml-core
uml-layout → uml-model, uml-notation, uml-core
uml-print → uml-dsl (CST types), uml-model, uml-core
uml-dsl → uml-model, uml-core
uml-rules → uml-model, uml-core
uml-notation → uml-core
uml-model → uml-core
```

No reverse imports. No cycles.

---

## 5. All 14 diagram kinds

`DiagramKind` is exactly this union. Object diagrams are instance specifications in UML 2.5.1; GraphiQ still ships `object` as a first-class editor kind.

```ts
type DiagramKind =
  | "class"
  | "object"
  | "package"
  | "compositeStructure"
  | "component"
  | "deployment"
  | "profile"
  | "useCase"
  | "activity"
  | "stateMachine"
  | "sequence"
  | "communication"
  | "timing"
  | "interactionOverview";
```

Early steps stub **every** kind: types, notation records, empty connector matrices, layout-router cases that throw `not implemented` except for kinds already built. Agents must not add stringly-typed extra kinds.

Closed `ElementType` (step 4 must use these camelCase strings; no `abstractClass`):

```ts
type ElementType =
  | "class"
  | "interface"
  | "dataType"
  | "enumeration"
  | "primitiveType"
  | "associationClass"
  | "note"
  | "constraint"
  | "instanceSpecification"
  | "package"
  | "part"
  | "port"
  | "collaboration"
  | "collaborationUse"
  | "component"
  | "artifact"
  | "node"
  | "device"
  | "executionEnvironment"
  | "deploymentSpecification"
  | "profile"
  | "stereotype"
  | "metaclass"
  | "actor"
  | "useCase"
  | "subject"
  | "activity"
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
  | "interruptibleActivityRegion"
  | "stateMachine"
  | "region"
  | "state"
  | "pseudostate"
  | "finalState"
  | "interaction"
  | "lifeline"
  | "executionSpecification"
  | "combinedFragment"
  | "interactionUse"
  | "gate"
  | "destructionOccurrence"
  | "stateInvariant"
  | "timingState"
  | "durationConstraint"
  | "timeConstraint";
```

Closed `RelationshipType`:

```ts
type RelationshipType =
  | "association"
  | "navigableAssociation"
  | "aggregation"
  | "composition"
  | "generalization"
  | "realization"
  | "interfaceRealization"
  | "dependency"
  | "usage"
  | "nestedClassifier"
  | "link"
  | "packageImport"
  | "packageMerge"
  | "containment"
  | "connector"
  | "assemblyConnector"
  | "delegationConnector"
  | "componentRealization"
  | "deployment"
  | "communicationPath"
  | "manifestation"
  | "extension"
  | "include"
  | "extend"
  | "controlFlow"
  | "objectFlow"
  | "transition"
  | "message";
```

`message` carries `messageSort`: `synchCall` | `asynchCall` | `asynchSignal` | `reply` | `createMessage` | `deleteMessage`. Communication diagrams use `message` plus a sequence number field. Do not add a second message relationship type.

`pseudostate` carries `kind`: `initial` | `shallowHistory` | `deepHistory` | `join` | `fork` | `junction` | `choice` | `entryPoint` | `exitPoint` | `terminate`.

### 5.1 Class

**Elements:** Class (`isAbstract` boolean; DSL `abstract class` and the stencil item “Abstract class” set this flag — not a separate `ElementType`), Interface, DataType, Enumeration, PrimitiveType, AssociationClass, Note, Constraint.

**Relationships:** Association, NavigableAssociation, Aggregation, Composition, Generalization, Realization, Dependency, Usage, NestedClassifier, InterfaceRealization.

**Notation:**

- Classifier: rectangle, three compartments (name, attributes, operations). Extra compartments later.
- Abstract name: italic. Interface name: `«interface»` above the name.
- Visibility: `+` public, `-` private, `#` protected, `~` package.
- Attribute: `visibility name: Type [multiplicity] = default`.
- Operation: `visibility name(params): ReturnType`.
- Generalization: solid line, hollow closed triangle at the general classifier.
- Realization / interface realization: dashed line, hollow closed triangle at the interface.
- Association: solid line; open arrowhead only for navigability.
- Aggregation: hollow diamond at the aggregate.
- Composition: filled diamond at the composite.
- Dependency: dashed line, open arrowhead.
- Multiplicity text at each association end (`1`, `0..1`, `1..*`, `0..*`, `n`, `n..m`).

**Layout:** `elk.layered`, direction DOWN, orthogonal edge routing, ports on classifier sides.

**Canvas:** XYFlow. Custom class node with three stacked compartments. Custom edge markers from `uml-notation`.

**Rules (minimum for the class step):**

- `class.gen.same-metaclass` — generalization only between compatible classifiers (Class–Class, Interface–Interface, DataType–DataType). A Class cannot generalize an Interface.
- `class.realize.classifier-to-interface` — realization source is BehavioredClassifier; target is Interface.
- `class.compose.two-classifiers` — composition/aggregation ends are Properties on Classes/Associations, not on Notes.
- `class.assoc.multiplicity-syntax` — multiplicity matches `N | N..N | N..* | * | 0..1 | 1..*` with `N` integer, lower ≤ upper when both bound.
- `class.diamond-only-on-assoc` — filled/hollow diamonds are only composition/aggregation, never on generalization.
- Recursive composition of the same class type (`Node *-- Node`) is legal. Do not add a rule that forbids it.
- `class.actor-forbidden` — Actor, UseCase, Node, Lifeline cannot appear on a class diagram.

**DSL sketch:**

```text
diagram class OrderDomain

class Order {
  -id: UUID
  +calculateTotal(): Float
}

interface Payable {
  +pay(amount: Money): Boolean
}

abstract class Document

enum OrderStatus {
  Draft
  Paid
}

Order "1" --> "*" LineItem : contains
Order *-- LineItem
Order --|> Document
Order ..|> Payable
Order ..> Mailer : uses
```

Arrow token mapping for class DSL: `--|>` generalization, `..|>` realization, `-->` navigable association, `--` association, `o--` aggregation, `*--` composition, `..>` dependency. Multiplicity strings sit on either side of the connector.

### 5.2 Object

**Elements:** InstanceSpecification, Slot, Link (instance of Association), Note.

**Relationships:** Link, Dependency.

**Notation:** `instanceName: Classifier` underlined in a rectangle. Slots as `attr = value`. Links as solid lines, no aggregation diamonds unless the association they instantiate has one — v1 draws a plain solid link and shows the association name.

**Layout:** `elk.layered` LEFT-RIGHT or DOWN; orthogonal routing.

**Canvas:** XYFlow instance nodes (single or two compartments).

**Rules:**

- `object.classifier-exists` — `:Type` must name a classifier in the same model or an unresolved-type warning (warning, not error, if the type is an external name).
- `object.slot-known-structural-feature` — slot names should match attributes of the classifier when the classifier is in-model.
- `object.no-generalization` — generalization is illegal on object diagrams.
- `object.link-two-instances` — links connect instance specifications, not classes.

**DSL sketch:**

```text
diagram object CheckoutSnapshot

instance a: Order {
  id = "o-1"
  status = Paid
}

instance b: LineItem

a -- b : contains
```

### 5.3 Package

**Elements:** Package, PackageImport, PackageMerge, PackageableElement (shown as nested classifiers optional).

**Relationships:** PackageImport (`«import»`), PackageMerge (`«merge»`), Containment, Dependency, Package nesting.

**Notation:** Folder-tab rectangle. Nested packages drawn inside. Import/merge as dashed arrows with the keyword.

**Layout:** `elk.mrtree` or layered with hierarchy; children inside parent bounds.

**Canvas:** XYFlow parent nodes (`parentId`). Nested drop must reparent in the model.

**Rules:**

- `pkg.import.package-to-package`
- `pkg.merge.package-to-package`
- `pkg.no-cycle-merge` — package merge graph is acyclic.
- `pkg.cannot-import-class-as-package`

**DSL sketch:**

```text
diagram package System

package billing {
  class Invoice
}

package catalog {
  class Product
}

billing ..> catalog : «import»
```

### 5.4 Composite structure

**Elements:** EncapsulatedClassifier (shown as a frame), Property/Part, Port, Connector, Collaboration, CollaborationUse.

**Relationships:** Connector (assembly), Port provided/required (ball/socket on the boundary), Role binding.

**Notation:** Large class/component frame. Parts as rectangles with `role: Type`. Ports as small squares on the border. Ball = provided, socket = required. Connectors solid between parts/ports.

**Layout:** `elk.box` / containment; ports on the parent border.

**Canvas:** XYFlow with parent frame, part children, port handles.

**Rules:**

- `cs.port-on-encapsulated-classifier`
- `cs.connector-ends-are-parts-or-ports`
- `cs.no-generalization-inside-as-connector`

**DSL sketch:**

```text
diagram compositeStructure CarInternals

class Car {
  part engine: Engine
  part wheels: Wheel [4]
  port power: PowerPort
}

connector c1 : engine.power to power
```

### 5.5 Component

**Elements:** Component, Port, Interface (provided/required), Artifact (optional), Note.

**Relationships:** ComponentRealization, InterfaceRealization (provided), Usage (required), Assembly connector, Delegation connector, Dependency.

**Notation:** Rectangle with the component icon (two small stacked rectangles on the left edge) or `«component»`. Ball-and-socket for provided/required. Assembly between ball and socket. Delegation from outer port to inner.

**Layout:** `elk.layered` with ports.

**Canvas:** XYFlow component nodes, interface lollipops as attached nodes or port handles.

**Rules:**

- `cmp.provided-is-interface`
- `cmp.required-is-interface`
- `cmp.assembly-provided-to-required`
- `cmp.delegation-outer-to-inner-same-component`
- `cmp.no-actor`

**DSL sketch:**

```text
diagram component Shop

component Payments {
  provides Billing
  requires Ledger
}

component Accounting {
  provides Ledger
}

Payments required Ledger -- provided Ledger Accounting
```

### 5.6 Deployment

**Elements:** Node, Device, ExecutionEnvironment, Artifact, DeploymentSpecification, CommunicationPath.

**Relationships:** Deployment (`«deploy»` artifact on node), CommunicationPath, Manifestation, Generalization between nodes.

**Notation:** Node as a 3D box. Artifacts as rectangles with a dog-ear and `«artifact»`. Communication paths as solid lines between nodes. Deploy as a dashed `«deploy»` or artifact nested in the node (v1 supports nested notation).

**Layout:** `elk.layered` DOWN, orthogonal.

**Canvas:** XYFlow 3D-ish node chrome (CSS isometric border, not a real 3D engine). Nested artifacts as children.

**Rules:**

- `dep.deploy-artifact-to-node`
- `dep.comm-path-between-nodes`
- `dep.device-and-ee-are-nodes`
- `dep.no-usecase-elements`

**DSL sketch:**

```text
diagram deployment Prod

node "AppCluster" <<device>> {
  artifact shop.war
}

node "DB" <<device>> {
  artifact shop.db
}

AppCluster -- DB : SQL
```

### 5.7 Profile

**Elements:** Profile, Stereotype, Metaclass (reference), Extension, Primitive/Enumeration used by stereotype properties.

**Relationships:** Extension (solid line, filled triangle at the metaclass — UML extension marker), Generalization between stereotypes, ProfileApplication (later; v1 can omit applying a profile to a model).

**Notation:** Package-like frame with `«profile»`. Stereotype as a class box with `«stereotype»`. Extension line with a filled closed triangle (not the generalization hollow triangle).

**Layout:** `elk.layered`.

**Canvas:** XYFlow class-like boxes plus extension edges with the filled-triangle marker.

**Rules:**

- `prf.extension-stereotype-to-metaclass`
- `prf.extension-marker-is-filled-triangle`
- `prf.stereotype-generalization-stereotype-to-stereotype`
- `prf.metaclass-not-a-user-class` — metaclasses are named UML metaclasses (`Class`, `Association`, `Actor`, …) from a closed list.

**DSL sketch:**

```text
diagram profile JavaProfile

stereotype Entity {
  table: String
}

extension Entity -> Class
```

### 5.8 Use case

**Elements:** Actor, UseCase, Subject (system boundary), Package (optional grouping).

**Relationships:** Association (actor–use case), Include (`«include»`), Extend (`«extend»` with optional extension points), Generalization (actor–actor, use case–use case).

**Notation:** Actor as stick figure (class-box actor with `«actor»` is an allowed alternate, stencil default is stick figure). Use case as ellipse. Subject as a rectangle containing use cases, name of the system at the top. Include: dashed open arrow from base to included, label `«include»`. Extend: dashed open arrow from extending use case to the extended (base) use case, label `«extend»`.

**Layout:** custom: actors outside left/right of the subject rectangle; use cases packed inside; then route include/extend with ELK or orthogonal router.

**Canvas:** XYFlow; subject is a parent node; actors are siblings, not children of the subject.

**Rules:**

- `uc.assoc.actor-to-usecase` — binary association in this diagram is actor–use case (not actor–actor; use generalization for actor taxonomy).
- `uc.include.usecase-to-usecase`
- `uc.extend.usecase-to-usecase`
- `uc.extend.direction` — arrow points at the extended/base use case.
- `uc.gen.actor-actor-or-uc-uc`
- `uc.no-class-attributes` — classes, nodes, states are illegal.

**DSL sketch:**

```text
diagram useCase Storefront

actor Customer
actor Clerk

subject Shop {
  usecase Checkout
  usecase Pay
  usecase Refund
}

Customer -- Checkout
Checkout ..> Pay : «include»
Refund ..> Checkout : «extend»
Clerk -- Refund
```

### 5.9 Activity

**Escalate** for implementation. Architecture is mandatory in stubs.

**Elements:** Activity, Action (OpaqueAction, CallBehaviorAction), ObjectNode, InitialNode, ActivityFinalNode, FlowFinalNode, DecisionNode, MergeNode, ForkNode, JoinNode, ActivityPartition (swimlane), InterruptibleActivityRegion, ExceptionHandler (v1 may stub).

**Relationships:** ControlFlow, ObjectFlow.

**Notation:** Action = rounded rectangle. Initial = filled circle. Activity final = bullseye. Flow final = circle with X. Decision/merge = diamond. Fork/join = thick bar. Partitions = labeled columns/rows. Control flow = solid arrow. Object flow = solid arrow, optionally with pins.

**Layout:** custom partition columns, then `elk.layered` DOWN inside each partition; fork/join span partitions when needed.

**Canvas:** dedicated activity canvas (SVG or XYFlow with a partition parent). Do not use sequence geometry.

**Rules:**

- `act.flow-from-executable-or-control-node`
- `act.initial-no-incoming`
- `act.final-no-outgoing`
- `act.decision-has-guards-on-outgoing` (warning if missing)
- `act.fork-join-balance` (warning)
- `act.no-classes-as-actions`

**DSL sketch:**

```text
diagram activity FulfillOrder

partition Sales {
  action ReceiveOrder
}

partition Warehouse {
  action Pack
  action Ship
}

initial --> ReceiveOrder
ReceiveOrder --> Pack
Pack --> Ship
Ship --> final
```

### 5.10 State machine

**Escalate** for implementation.

**Elements:** StateMachine, Region, State (simple, composite, submachine), Pseudostate (initial, shallowHistory, deepHistory, join, fork, junction, choice, entryPoint, exitPoint, terminate), FinalState, Transition.

**Relationships:** Transition with `trigger [guard] / effect`.

**Notation:** State = rounded rectangle; optional compartments (name, internal activities `entry`/`do`/`exit`, internal transitions). Initial = filled circle. Final = bullseye. Choice = hollow diamond. Terminate = X. Composite = nested states. Transition = solid arrow with label.

**Layout:** `elk.layered` with nested graphs for composite states; orthogonal routing.

**Canvas:** XYFlow nested nodes; transition labels as edge labels.

**Rules:**

- `sm.transition-between-vertices-of-same-machine`
- `sm.initial-one-outgoing-no-trigger` (classic well-formedness)
- `sm.final-no-outgoing`
- `sm.composite-has-region`
- `sm.no-class-operations-as-states`

**DSL sketch:**

```text
diagram stateMachine OrderLifecycle

[*] --> Draft
Draft --> Paid : pay [amount > 0] / emitReceipt
Paid --> [*]
```

### 5.11 Sequence

**Escalate** for implementation.

**Elements:** Interaction, Lifeline, ExecutionSpecification, Message (synchCall, asynchCall, asynchSignal, reply, createMessage, deleteMessage), CombinedFragment (alt, opt, loop, par, break, critical, neg, ignore, consider, assert, seq, strict), InteractionUse, Gate, DestructionOccurrence, StateInvariant (optional v1).

**Relationships:** Message with send and receive event occurrences ordered on each lifeline.

**Notation:** Lifeline = head (rectangle or actor) + dashed vertical line. Execution spec = thin tall rectangle on the lifeline. Synchronous call = solid line, filled closed arrowhead. Asynchronous = solid line, open arrowhead. Reply = dashed line, open arrowhead. Create = dashed message to a lifeline head lower on the page. Delete = message to X at the end of a lifeline. Combined fragments = labeled frames (`alt`, `opt`, `loop`, …) with operand dashed separators.

**Layout:** custom only. Lifelines equally spaced on X. Message Y from interaction order. Execution specs from start/end message events. Combined fragment frames enclose operand messages.

**Canvas:** dedicated sequence SVG engine. XYFlow may host the viewport, but messages are not ELK edges.

**Rules:**

- `sd.message-between-lifelines-or-gates`
- `sd.reply-matches-synch-call`
- `sd.async-not-filled-arrow`
- `sd.execution-nested-properly`
- `sd.combined-fragment-operands-nonempty`
- `sd.create-target-is-lifeline`
- `sd.no-class-compartments-on-lifeline-head` (head shows name[:Type], not attributes)

**DSL sketch:**

```text
diagram sequence Checkout

lifeline customer: Actor
lifeline shop: Shop
lifeline pay: Payments

customer -> shop : placeOrder()
shop -> pay : charge()
pay -->> shop : ok
shop -->> customer : confirmation
```

Message tokens: `->` synchronous, `->>` asynchronous, `-->>` reply, `-->` create (document in parser tests). Keep this mapping stable; do not copy PlantUML’s conflicting arrows blindly.

### 5.12 Communication

**Elements:** Lifeline / InstanceSpecification as rectangles, Link, Message (numbered).

**Relationships:** Connecting paths (like links) with numbered messages along the path (`1`, `1.1`, `2`).

**Notation:** Objects as rectangles. Solid connector paths. Messages as named arrows along the path with sequence numbers. Direction shown by a small arrow.

**Layout:** `elk.stress` or `elk.layered` for objects; message labels placed along edge midpoints with an offset so numbers do not overlap.

**Canvas:** XYFlow instance nodes + labeled multi-message edges (one model relationship bundle per pair, or one edge per message — prefer one edge per message for selection).

**Rules:**

- `comm.message-has-sequence-number`
- `comm.number-unique-in-interaction`
- `comm.no-lifeline-dashes` — this is not a sequence diagram.

**DSL sketch:**

```text
diagram communication CheckoutComm

instance customer: Customer
instance shop: Shop

customer -> shop : 1: placeOrder()
shop -> customer : 2: confirm()
```

### 5.13 Timing

**Escalate** for implementation.

**Elements:** Interaction, Lifeline, State/Condition timeline, Message, DurationConstraint, TimeConstraint.

**Notation:** Horizontal (v1 default) or vertical timing frames. Lifeline name in a left column. States as labeled bands or a stepwise waveform. Time ticks on an axis. Messages as vertical arrows between lifelines at a time. Duration `{d..t}`.

**Layout:** custom timing engine only.

**Canvas:** dedicated SVG. Not XYFlow nodes-as-classes.

**Rules:**

- `tm.state-belongs-to-lifeline`
- `tm.intervals-non-overlapping-per-lifeline`
- `tm.message-at-shared-time`
- `tm.no-class-operations-compartment`

**DSL sketch:**

```text
diagram timing Lamp

lifeline lamp: Lamp

lamp {
  Off @ 0
  On  @ 10
  Off @ 40
}
```

### 5.14 Interaction overview

**Escalate** for implementation.

**Elements:** InteractionOverview (activity-like), Initial/Final, Decision, Fork/Join, InteractionUse (`ref` frames), inline Interaction (optional v1: `ref` only).

**Relationships:** ControlFlow between overview nodes.

**Notation:** Activity notation where some nodes are interaction-use frames (`ref Name`).

**Layout:** `elk.layered` DOWN like a simple activity, large min node size for `ref` frames.

**Canvas:** XYFlow with interaction-use nodes; or the activity canvas with a second node type. Do not reuse sequence canvas.

**Rules:**

- `io.ref-names-an-interaction` (warning if unresolved)
- `io.flow-activity-like`
- `io.no-raw-messages-outside-ref`

**DSL sketch:**

```text
diagram interactionOverview OrderFlow

initial --> ref Checkout
ref Checkout --> ref Fulfill
ref Fulfill --> final
```

---

## 6. GraphiQ DSL (core language)

One language, diagram header required:

```text
diagram <kind> <OptionalName>
```

`<kind>` must match `DiagramKind`. The parser selected by kind does not accept foreign elements (a `lifeline` in `diagram class` is a parse error, not a dropped token).

Design rules:

- Chevrotain grammar per kind in `packages/uml-dsl/src/grammars/<kind>.ts`, plus shared tokens in `tokens.ts`.
- Lexer is not one giant catch-all that makes every diagram a soup of optional rules.
- Error recovery: resync at the next `class` / `actor` / `lifeline` / top-level keyword so one bad line does not zero the model.
- Keywords are reserved per kind.
- Comments: `//` line and `/* */` block; printer preserves them when CST is present.
- Stereotypes: `«name»` or `<<name>>` in source; printer emits `«name»`.

Do not implement PlantUML’s `skinparam`, `!include`, or non-UML arrows in the core.

**Shareable language guide:** the editor ships a checked-in Markdown file (`graphiq-dsl-guide.md`) that is the prompt and reference for producing GraphiQ DSL. It is not Mermaid, not PlantUML, and not JSON. A Download button saves that file. An Import button loads a `.md` / `.dsl` / `.txt` file into the DSL pane (extract the first `diagram <kind>` document if the file also contains prose). Parsing still follows the active document kind and the grammars that exist; unimplemented kinds stay parse errors until their kind steps land.

---

## 7. Rules engine

```ts
type Severity = "error" | "warning";

type UmlRule = {
  id: string;
  diagramKinds: DiagramKind[];
  severity: Severity;
  check: (model: UmlModel) => Diagnostic[];
};

type ConnectorKey = {
  kind: DiagramKind;
  relationship: RelationshipType;
  source: ElementType;
  target: ElementType;
};
```

`validate(kind, model)` runs:

1. Connector matrix: every relationship must be a allowed triple. Missing cell = illegal (`rules.illegal-connector`).
2. Kind membership: every element’s `ElementType` must be in the kind’s allowed set (`rules.illegal-element-on-diagram`).
3. Registered semantic rules for that kind.

Illegal connectors are rejected at command time (canvas) and reported at validate time (text). The matrix is data in `packages/uml-rules/src/matrices/<kind>.ts`. Empty matrix means **nothing is connectable** until the kind’s step fills it. That is intentional.

Diagnostics:

```ts
type Diagnostic = {
  id: string;
  ruleId: string;
  severity: Severity;
  message: string;
  elementIds: string[];
  dslSpan?: { start: number; end: number };
};
```

---

## 8. Notation (OMG mapping)

`uml-notation` exports a table keyed by `RelationshipType` and `ElementType`.

Marker ids (SVG):

| Marker | Used for |
|---|---|
| `gen-hollow-triangle` | Generalization |
| `realize-hollow-triangle` | Realization (on a dashed line) |
| `assoc-open` | Navigable association |
| `agg-hollow-diamond` | Aggregation (source/composite end) |
| `comp-filled-diamond` | Composition |
| `dep-open` | Dependency, usage, include/extend (dashed) |
| `ext-filled-triangle` | Profile extension |
| `msg-sync-filled` | Sequence synchCall |
| `msg-async-open` | Sequence asynchCall / asynchSignal |
| `msg-reply-open` | Sequence reply (dashed) |

Line styles: `solid` | `dash`. Dash pattern is CSS `stroke-dasharray: 6 4` unless a test requires otherwise.

Class box geometry (logical, not CSS magic numbers scattered in components):

- Min width 180, min height 72.
- Name compartment 32px, attribute and operation rows 20px.
- Font: Inter or system UI, 12px body, 13px bold name; italic for abstract.

Actors: 24×40 stick figure plus name below. Use cases: ellipse min 140×70.

---

## 9. Editor UI (when the web app exists)

Lucidchart-like density, not a marketing landing page.

- Left: glass sidebar with diagram title, kind, legal stencil for the active `DiagramKind` only, **Download DSL guide** (`.md`), and **Import DSL** (`.md` / `.dsl` / `.txt`).
- Center: canvas (kind renderer), grid, snap, zoom. One **Export** island on the canvas opens the export page.
- Right or bottom split: CodeMirror DSL.
- Bottom / corner: diagnostics list.

Stencil drag must call model commands, not insert raw XYFlow nodes.

---

## 10. Persistence and export

**IndexedDB (Dexie)** after the class round-trip works:

- Database `graphiq`, store `documents` keyed by `id`.
- Autosave debounced 500ms after model or overlay changes.
- Last-open id in `meta`.

**Export SVG/PNG/PDF** after persist:

- Open the export page from one canvas button. Preview is a read-only live canvas (same node renderers), not a simplified redraw.
- Capture that sheet with `html-to-image` (MIT; not a paid exporter) at 2×. PNG via blob; SVG from the same capture; PDF embeds the raster in a one-page file.
- Options: full canvas, crop to content, custom crop, set page size (A4 / Letter / A3), include page fill.
- Do not use a third-party paid exporter.

**Export GraphiQ DSL guide (Markdown)** after editor chrome exists:

- Filename `graphiq-dsl-guide.md`.
- Contents: how GraphiQ DSL works, the closed 14-kind list, per-kind keywords and arrows, one complete example per kind from §5, and instructions to return a single document starting with `diagram <kind>`.
- Do not ask an LLM to generate this file at runtime. It is a static asset in the app.

**Import generated DSL:** a file picker loads text into the CodeMirror buffer. If the file is the guide plus generated code, take the first block that starts with `diagram` and a legal `DiagramKind`. If that kind differs from the open document and a new-document control exists, open a document of that kind; otherwise it is a kind-mismatch parse error.

No backend in v1.

---

## 11. Testing policy

| Layer | Tool | What to prove |
|---|---|---|
| Model commands | Vitest | Illegal commands leave the model unchanged |
| Rules + matrices | Vitest | Golden illegal pairs fail; legal pairs pass |
| DSL parse/print | Vitest | Fixture round-trip; parse errors have offsets |
| Layout | Vitest | Nodes get finite x/y; sequence order matches message order |
| Editor | Playwright | Type DSL → node appears; illegal connect refused; drag does not change DSL |

Every package that has logic ships `src/**/*.test.ts`. A step is not done if the new code has no tests.

---

## 12. Git and commit protocol

- Branch: `dev` only.
- Author and committer: `Senuka Deneth` `<113520257+Senuka-Deneth@users.noreply.github.com>`.
- Set identity per commit with `git -c user.name=... -c user.email=...`. Never `git config`. Never Cursor Agent. Never `Co-authored-by`. Never `--no-verify` unless the user asks.
- Message: one imperative sentence of **what was added**. No author, no “docs updated”, no “documentation updated”, no issue numbers unless the user asks.
- After each commit on `dev`, push to the cloud repo: `git push -u origin dev`. Never force-push.
- Contributors on GitHub must remain only Senuka Deneth.

---

## 13. Self-review gate (every step)

Before commit, the implementing agent must:

1. Re-read every changed file.
2. Confirm the diff stays inside the step’s allowed paths.
3. Confirm exhaustive `switch`/`never` for any new union variant.
4. Run the step’s verification commands and fix failures.
5. Grep the diff for `any`, PlantUML, Monaco, JointJS, Dagre-as-primary, Next.js, and extra diagram kinds.
6. Fix every issue found, then re-run verification.
7. Commit on `dev`, then `git push -u origin dev`. Never force-push.

If review finds the step is too large or an Escalate step was started on Composer 2.5, stop and say so. Do not commit a partial Escalate implementation.

---

## 14. Agent checklist

Execute up to **three** steps per session. Finish one step fully before starting the next (or stop after any finished step). Mark a step complete only when Done when is true, the commit exists on `dev`, and `dev` is pushed to `origin`.

Shared verification unless a step overrides it:

```bash
pnpm -r typecheck
pnpm -r test
```

After the web app exists, also:

```bash
pnpm --filter @graphiq/web build
```

---

### Step 1 — Build guide and agent rules

**Status:** this repository’s first spec commit. If these files already exist, skip.

**Model:** Composer 2.5

**In scope:** `docs/GRAPHIQ_BUILD_GUIDE.md`, `.cursor/rules/graphiq-agent.mdc`

**Out of scope:** application code

**Done when:** both files exist on `dev`, are committed as Senuka Deneth, and `dev` is pushed to `origin`.

**Commit message:** `Add GraphiQ build guide and agent rules`

---

### Step 2 — pnpm monorepo and Vite app shell

**Model:** Composer 2.5

**In scope:**

- Root `package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `tsconfig.base.json`, `.gitignore`, `.nvmrc` (`22`)
- `apps/web` Vite + React 19 + TypeScript + Tailwind
- Empty workspace packages with `package.json`, `tsconfig.json`, `src/index.ts` that compiles (`export const packageName = "@graphiq/<name>"`)
- Root scripts: `dev`, `test`, `typecheck`, `build`

**Out of scope:** XYFlow, Chevrotain, ELK, Dexie, any UML types beyond a comment pointing at this guide

**Allowed paths:** root config files, `apps/web/**`, `packages/*/package.json`, `packages/*/tsconfig.json`, `packages/*/src/index.ts`

**Implementation notes:**

- App title `GraphiQ`. Blank page with `GraphiQ` heading is enough.
- `pnpm-workspace.yaml` lists `apps/*` and `packages/*`.
- Each package name is `@graphiq/<dir>`.
- Strict `tsconfig`: `strict`, `noUncheckedIndexedAccess`, `noEmit` for app, `composite` for packages if using project references.
- Gitignore: `node_modules`, `dist`, `coverage`, `.turbo`, editor junk, `.env`.

**Done when:** `pnpm install`, `pnpm -r typecheck`, `pnpm --filter @graphiq/web build` succeed locally. `pnpm --filter @graphiq/web dev` serves the heading.

**Tests:** a Vitest smoke test in `apps/web` that `true` is true is acceptable; prefer a tiny React render test if the test stack is ready.

**Commit message:** `Add pnpm workspaces and Vite React app shell`

---

### Step 3 — uml-core

**Model:** Composer 2.5

**In scope:** `packages/uml-core/**`

**Add:**

- `DiagramKind` union of all 14 plus `DIAGRAM_KINDS` array
- `isDiagramKind(value: string)`
- `createId(): string` (UUID v4)
- `Diagnostic`, `Severity`, `DslSpan`
- `assertNever(x: never): never`
- Exhaustive helper tests: `DIAGRAM_KINDS.length === 14`

**Out of scope:** model elements, React

**Done when:** Vitest covers the 14 kinds and `assertNever`. `pnpm --filter @graphiq/uml-core test` passes.

**Commit message:** `Add uml-core diagram kinds and diagnostics`

---

### Step 4 — uml-model types for all 14 kinds

**Model:** Composer 2.5

**In scope:** `packages/uml-model/**`

**Add:**

- `ElementType` and `RelationshipType` unions **exactly** as listed in §5 (no extra members, no `abstractClass`)
- `UmlElement`, `UmlRelationship`, `UmlModel` with `id`, `kind`, `elements`, `relationships`
- `emptyModel(kind: DiagramKind): UmlModel`
- Per-kind allowed element and relationship sets (data tables)
- `isElementAllowedOn(kind, elementType)`, `isRelationshipAllowedOn(kind, relationshipType)`
- Command stubs: `addElement`, `removeElement`, `addRelationship`, `removeRelationship` that enforce allowed sets and assign UUIDs
- Exhaustive switches on `DiagramKind` in those tables

**Out of scope:** Chevrotain, layout, UI, full class-attribute command set (attributes can be a field on Class now: `attributes: Attribute[]`, `operations: Operation[]` with types)

**Classifiers in this step** should already support attributes, operations, visibility, `isAbstract`, multiplicity strings on association ends (fields exist even if UI does not).

**Done when:** tests create a class model, reject adding a Lifeline to a class model, reject a Message on a class model, accept adding a Class.

**Commit message:** `Add uml-model types and commands for all diagram kinds`

---

### Step 5 — uml-notation specs and SVG markers

**Model:** Composer 2.5

**In scope:** `packages/uml-notation/**`

**Add:**

- Marker table from §8
- Line style per `RelationshipType`
- Compartment metrics for class-like boxes
- `getRelationshipNotation(type)` and `getElementNotation(type)`
- SVG marker path snippets or data (strings) consumed later by the web app
- Exhaustive switch tests: every `RelationshipType` has notation

**Out of scope:** React components

**Done when:** Vitest fails if a new relationship type is added without notation.

**Commit message:** `Add UML notation specs and marker definitions`

---

### Step 6 — uml-rules engine and empty matrices

**Model:** Composer 2.5

**In scope:** `packages/uml-rules/**`

**Add:**

- `validate(kind, model): Diagnostic[]`
- `rules.illegal-element-on-diagram`
- `rules.illegal-connector`
- Matrices for all 14 kinds; **every matrix is empty**. Class legal triples are step 7.
- Rule registry that can register later rules
- Tests: empty class model validates; a forged relationship between two classes on a class diagram is illegal until step 7 fills the matrix

**Out of scope:** filling class legal triples (next step)

**Done when:** `pnpm --filter @graphiq/uml-rules test` passes.

**Commit message:** `Add uml-rules engine and empty connector matrices`

---

### Step 7 — Class diagram rules

**Model:** Composer 2.5

**In scope:** `packages/uml-rules/src/matrices/class.ts`, `packages/uml-rules/src/rules/class/*.ts`, tests

**Add:** every class rule in §5.1 and the legal connector triples for class (association, navigable association, aggregation, composition, generalization, realization, dependency, usage, nested classifier).

**Legal triples (class):** `isAbstract` does not change `ElementType`. Use `Class` for both concrete and abstract classes.

- Generalization: Class→Class, Interface→Interface, DataType→DataType, PrimitiveType→PrimitiveType, Enumeration→Enumeration
- Realization / InterfaceRealization: Class→Interface
- Association / NavigableAssociation: Class, DataType, Enumeration, PrimitiveType, Interface, AssociationClass — any to any in that set
- Aggregation / Composition: Class→Class (AssociationClass may participate as an association end’s type is still Class)
- Dependency / Usage: any class-diagram classifier to any class-diagram classifier
- NestedClassifier: Class→Class, Class→Interface, Class→Enumeration, Class→DataType, Class→PrimitiveType

**Tests:** Actor-like element cannot be added (model already blocks); Class cannot `--|>` Interface; Class can `..|>` Interface; bad multiplicity `1..0` errors; legal `0..*` passes.

**Done when:** all listed rule ids appear in diagnostics for failing fixtures.

**Commit message:** `Add class diagram connector matrix and well-formedness rules`

---

### Step 8 — Class Chevrotain grammar

**Model:** Composer 2.5

**In scope:** `packages/uml-dsl/**` class grammar, tokens, AST, `parse(kind, text)`

**Add:** parse `diagram class`, class/interface/abstract/enum bodies, attributes, operations, the class arrow tokens in §5.1, multiplicities, relationship names after `:`.

**Out of scope:** printer, other kinds (other kinds return a clear `unsupported kind` parse error)

**Tests:** fixtures for the §5.1 DSL sketch; bad token reports `dslSpan`; recovery still parses a second class after a broken line.

**Done when:** AST contains classes, members, and relationships with end multiplicities.

**Commit message:** `Add Chevrotain grammar for class diagrams`

---

### Step 9 — Class printer

**Model:** Composer 2.5

**In scope:** `packages/uml-print/**`

**Add:** `print(kind, model, options?: { cst? })` for class only. Other kinds throw `not implemented`.

**Behavior:** deterministic member order (attributes then operations, model order). Relationships after classifiers. Do not emit coordinates. Round-trip: parse → model commands from AST → print → parse again yields structurally equal models (ids excluded).

**Format preservation:** if CST is passed, keep comments whose tokens still attach to surviving elements. If too hard, preserve whole-file comments at the top and still round-trip structure; full CST preservation is Step 29 (Escalate).

**Done when:** Vitest round-trip on the §5.1 fixture.

**Commit message:** `Add class diagram DSL printer`

---

### Step 10 — ELK class layout

**Model:** Composer 2.5

**In scope:** `packages/uml-layout/**`

**Add:**

- Layout router switching on all 14 kinds; class calls ELK layered DOWN orthogonal; every other kind throws `layout not implemented for <kind>`
- `layoutClass(model, overlay, mode)` writing x/y/width/height into overlay
- ELK runs in a worker wrapper usable from Node in tests (elkjs without DOM)
- Preserve existing overlay positions when `mode === "incremental"` except for ids missing positions

**Out of scope:** React, sequence layout

**Tests:** three classes + two generalizations produce increasing y or a parent above children; all coordinates finite; incremental mode does not move a node that already has x/y when no topology change requires it.

**Done when:** `pnpm --filter @graphiq/uml-layout test` passes.

**Commit message:** `Add ELK layered layout for class diagrams`

---

### Step 11 — XYFlow class nodes and OMG edges

**Model:** Composer 2.5

**In scope:** `apps/web/src/canvas/class/**`, wiring to notation markers, no DSL editor yet if that keeps the diff smaller — a storybook-less page that renders a hardcoded model is acceptable

**Add:**

- Class node with three compartments
- Interface and enum variants
- Edges using exact markers from `uml-notation`
- XYFlow controls: pan, zoom, snap-to-grid 8px, selection

**Out of scope:** CodeMirror, parse pipeline, stencil of all 14 kinds

**Done when:** `pnpm --filter @graphiq/web build` succeeds. Manual or Playwright: a fixture model shows a hollow triangle on generalization and a filled diamond on composition.

**Tests:** Playwright or a DOM test that generalization marker id is `gen-hollow-triangle`.

**Commit message:** `Add XYFlow class nodes and UML edge markers`

---

### Step 12 — Editor chrome

**Model:** Composer 2.5

**In scope:** `apps/web` shell layout

**Add:** left stencil (class-kind elements only), center canvas from step 11, right CodeMirror 6 pane (not wired to parse yet), top bar with title, bottom diagnostics list (empty).

**CodeMirror:** plain text + a minimal highlight for `class`, `interface`, `diagram`. Full Chevrotain highlighter can wait until step 13.

**Out of scope:** parse-on-type, Dexie, other diagram canvases

**Done when:** local `pnpm --filter @graphiq/web dev` shows the three panes. Stencil lists Class, Interface, Enumeration, Abstract class, Note.

**Commit message:** `Add editor chrome with stencil canvas and CodeMirror`

---

### Step 13 — Text to model to layout to canvas

**Model:** Composer 2.5

**In scope:** Zustand store, parse debounce, patch model from class AST, validate, incremental layout, XYFlow as a view

**Behavior:** typing the §5.1 sketch produces boxes and edges. Parse errors fill diagnostics and keep the last good model. `diagram useCase` in the buffer is a parse error on a class document (v1 document kind is class until other kinds have documents).

**v1 document kind:** create documents as `class` only until later steps add kind switcher that creates a new document.

**Out of scope:** canvas → text, IndexedDB

**Done when:** Playwright: fill editor with two classes and `A --|> B`, assert two class nodes and a generalization edge.

**Commit message:** `Wire class DSL parsing to layout and canvas`

---

### Step 14 — Canvas structural edits to model to text

**Model:** Composer 2.5

**In scope:** stencil drop → `addElement`; connect two classes with a chosen relationship tool; edit class name and a member; delete; printer updates CodeMirror; **move does not print**

**Relationship tool:** a small toolbar: Association, Aggregation, Composition, Generalization, Realization, Dependency. Matrix rejects illegal connects with a diagnostic, no edge created.

**Out of scope:** CST format preservation beyond step 9, other kinds

**Done when:** Playwright: drop two classes, connect generalization, DSL contains `--|>`. Drag one node, DSL unchanged.

**Commit message:** `Wire class canvas commands to model and DSL print`

---

### Step 15 — Diagnostics UI

**Model:** Composer 2.5

**In scope:** bind `Diagnostic[]` to the bottom list and to canvas/edge highlight and CodeMirror squiggles using `dslSpan` when present

**Done when:** illegal DSL relationship shows the rule id in the list and the edge (if any) is marked. Parse error squiggles the line.

**Commit message:** `Add diagnostics list and canvas editor highlighting`

---

### Step 16 — Object diagrams

**Model:** Composer 2.5

**In scope:** model already has types; fill object matrix and rules (§5.2); object grammar; printer; layout via ELK; XYFlow instance nodes; document kind `object`; stencil; tests. Add a new-document (or kind) control so the user can open an `object` document. Each later kind step extends that control with its kind.

**Out of scope:** mixing class and object in one document

**Done when:** §5.2 DSL fixture round-trips and renders underlined instance names.

**Commit message:** `Add object diagram rules grammar layout and canvas`

---

### Step 17 — Package diagrams

**Model:** Composer 2.5

**In scope:** §5.3 matrix, rules, grammar, printer, hierarchical ELK, XYFlow parent packages, import/merge dashed keywords

**Done when:** nested package in DSL becomes a child node; merge cycle diagnostic fires.

**Commit message:** `Add package diagram rules grammar layout and canvas`

---

### Step 18 — Component diagrams

**Model:** Composer 2.5

**In scope:** §5.5 including provided/required, assembly, delegation, component icon, ports

**Done when:** ball-and-socket assembly only between provided and required; actor cannot be added.

**Commit message:** `Add component diagram rules grammar layout and canvas`

---

### Step 19 — Deployment diagrams

**Model:** Composer 2.5

**In scope:** §5.6 nodes, artifacts, communication paths, deploy nesting

**Done when:** artifact nested in a device renders inside the node; communication path is solid between nodes.

**Commit message:** `Add deployment diagram rules grammar layout and canvas`

---

### Step 20 — Profile diagrams

**Model:** Composer 2.5

**In scope:** §5.7 stereotypes, extension filled triangle, closed metaclass list

**Done when:** `extension Entity -> Class` renders filled triangle; `extension Entity -> Order` (user class) is illegal.

**Commit message:** `Add profile diagram rules grammar layout and canvas`

---

### Step 21 — Use case diagrams

**Model:** Composer 2.5

**In scope:** §5.8 actors, ellipses, subject boundary, include/extend direction, actor generalization

**Layout:** custom packer as specified; do not use force-directed as the primary algorithm.

**Done when:** include arrow is dashed `«include»` toward the included use case; actor is not inside the subject unless the user dropped it there — default stencil drop of actor is outside.

**Commit message:** `Add use case diagram rules grammar layout and canvas`

---

### Step 22 — Composite structure diagrams

**Model:** Composer 2.5

**In scope:** §5.4 parts, ports, connectors, box/containment layout

**Done when:** port sits on the parent border; connector between parts validates; generalization tool is not offered or is rejected.

**Commit message:** `Add composite structure diagram rules grammar layout and canvas`

---

### Step 23 — Communication diagrams

**Model:** Composer 2.5

**In scope:** §5.12 numbered messages, instance nodes, not sequence dashes

**Done when:** messages show sequence numbers; duplicate numbers error; DSL fixture round-trips.

**Commit message:** `Add communication diagram rules grammar layout and canvas`

---

### Step 24 — Activity diagrams

**Model:** Escalate — Grok 4.6 Extra High

**In scope:** §5.9 partitions, control nodes, control/object flows, custom lane layout + ELK inside lanes, dedicated canvas if XYFlow parent nodes are insufficient

**Done when:** initial has no incoming; final has no outgoing; swimlanes exist; §5.9 fixture lays out without overlapping actions inside a lane.

**Commit message:** `Add activity diagram rules grammar layout and canvas`

---

### Step 25 — State machine diagrams

**Model:** Escalate — Grok 4.6 Extra High

**In scope:** §5.10 vertices, transitions, composite nested graphs, initial/final rules

**Done when:** `[*] --> Draft` works; trigger/guard/effect parse onto the transition; composite nested states layout inside the parent.

**Commit message:** `Add state machine diagram rules grammar layout and canvas`

---

### Step 26 — Sequence diagrams

**Model:** Escalate — Grok 4.6 Extra High

**In scope:** §5.11 custom sequence engine, message kinds and markers, combined fragments `alt`/`opt`/`loop` at minimum (implement the full combined-fragment list in the model even if the DSL starts with alt/opt/loop)

**Done when:** synch vs async vs reply markers differ; message order is top-to-bottom; execution specs appear for synch calls; Playwright screenshot-free assertions on marker ids and y-order.

**Commit message:** `Add sequence diagram engine grammar and canvas`

---

### Step 27 — Timing diagrams

**Model:** Escalate — Grok 4.6 Extra High

**In scope:** §5.13 custom timing engine, state intervals, time axis, optional messages between lifelines

**Done when:** overlapping intervals on one lifeline error; fixture renders ordered states on a time axis.

**Commit message:** `Add timing diagram engine grammar and canvas`

---

### Step 28 — Interaction overview diagrams

**Model:** Escalate — Grok 4.6 Extra High

**In scope:** §5.14 activity-like flows with `ref` frames

**Done when:** §5.14 fixture layouts as a directed activity; messages cannot be declared at the overview top level.

**Commit message:** `Add interaction overview diagram rules grammar layout and canvas`

---

### Step 29 — Format-preserving printer hardening

**Model:** Escalate — Grok 4.6 Extra High

**In scope:** `packages/uml-print`, CST mapping in `uml-dsl`

**Add:** comments attached to elements survive a canvas rename; user whitespace in a class body is kept when an unrelated class is added on the canvas; printer never writes overlay coordinates.

**Done when:** fixtures cover comment preservation and a bounded reprint after `addElement`.

**Commit message:** `Add format-preserving DSL printing from CST`

---

### Step 30 — IndexedDB persistence

**Model:** Composer 2.5

**In scope:** Dexie in `apps/web`, autosave, restore last document, new-document command per kind that already has a canvas

**Out of scope:** sync to a server

**Done when:** Playwright: type a class, reload, diagram and DSL restore.

**Commit message:** `Add IndexedDB document save and restore`

---

### Step 31 — SVG and PNG export

**Model:** Composer 2.5

**In scope:** export buttons using the rendered SVG including markers; PNG rasterization

**Done when:** exported SVG contains class names from the fixture; PNG is non-empty.

**Commit message:** `Add SVG and PNG diagram export`

---

### Step 32 — Playwright smoke across implemented kinds

**Model:** Composer 2.5

**In scope:** `apps/web` Playwright specs; one happy-path DSL per implemented kind; one illegal-connector test per implemented kind; drag-does-not-change-DSL on class

**Done when:** `pnpm --filter @graphiq/web test:e2e` (or repo-equivalent) passes locally.

**Commit message:** `Add Playwright smoke tests for implemented diagram kinds`

---

### Step 33 — Download GraphiQ DSL guide and import generated DSL

**Model:** Composer 2.5

**In scope:**

- Checked-in Markdown guide the Download button serves (do not generate it with an LLM at click time)
- Top-bar **Download DSL guide** — saves `graphiq-dsl-guide.md`
- Top-bar **Import DSL** — file picker for `.md`, `.dsl`, `.txt`; loads GraphiQ DSL into the editor

**Allowed paths:** `apps/web/**` (chrome, public/static asset, tests). Optional `docs/GRAPHIQ_DSL_GUIDE.md` only if the app copies or imports that same file; do not fork two guides.

**Guide file must contain:**

- What GraphiQ DSL is (text → model → canvas; not Mermaid, not PlantUML, not JSON, no coordinates in the DSL)
- Header: `diagram <kind> <OptionalName>`
- The exact 14 `DiagramKind` strings; do not list extra kinds
- Per kind: legal element keywords, relationship tokens, and the §5 DSL sketch as a complete copy-paste example
- Class arrow table: `--|>` generalization, `..|>` realization, `-->` navigable association, `--` association, `o--` aggregation, `*--` composition, `..>` dependency
- How to use it: give this file to a person or LLM; they return only a GraphiQ DSL document (or a fenced block) starting with `diagram <kind>`; type it into the DSL pane or use Import
- Forbidden output: Mermaid, PlantUML, `skinparam`, invented kinds, drawing JSON, `x`/`y` in the source

**Import behavior:**

- Read the file as UTF-8 text.
- If the file starts with `diagram`, load it whole.
- Else extract the first fenced or unfenced document whose first token line matches `diagram` + `isDiagramKind`.
- If the extracted kind is not the open document’s kind and the new-document control exists, create/open a document of that kind, then set the DSL buffer.
- Then run the existing parse → validate → layout path. Unimplemented kinds stay the existing unsupported-kind diagnostic.

**Out of scope:** PlantUML/Mermaid adapters, XMI, sending the file to a hosted LLM, changing notation or adding kinds

**Done when:**

- Download produces a `.md` file whose body includes `diagram class`, `diagram activity`, `diagram stateMachine`, and the other 11 kind headers from `DIAGRAM_KINDS`
- Playwright: Import of a small `diagram class` fixture fills the editor and (for class) yields class nodes
- Import of Mermaid `classDiagram` text does not become a GraphiQ class model

**Commit message:** `Add GraphiQ DSL guide download and DSL file import`

---

### Step 34 — Live canvas capture for export

**Model:** Composer 2.5

**In scope:** extract `KindCanvas`; canvas `preview` mode (no chrome, no grid, all nodes rendered); `html-to-image` capture at 2×; content bounds; PDF raster embed; stop using the simplified SVG redraw for downloads

**Allowed paths:** `apps/web/**`, `docs/GRAPHIQ_BUILD_GUIDE.md`

**Out of scope:** paid exporters, React Router

**Done when:** unit tests cover content bounds and PDF header; editor no longer downloads the center-to-center serializer.

**Commit message:** `Add live canvas diagram capture for export`

---

### Step 35 — Export page with PNG SVG and PDF

**Model:** Composer 2.5

**In scope:** one canvas Export button; Lucid-like export page using existing glass chrome; PNG, SVG, and PDF download from the live preview; remove sidebar SVG/PNG tiles

**Allowed paths:** `apps/web/**`, `docs/GRAPHIQ_BUILD_GUIDE.md`

**Done when:** Playwright opens export, preview shows class names, and Download yields PNG (magic + non-tiny), SVG (names + markers), and PDF (`%PDF`).

**Commit message:** `Add export page with PNG SVG and PDF download`

---

### Step 36 — Export crop page size and page fill

**Model:** Composer 2.5

**In scope:** Full canvas, crop to content, custom crop, set page size (A4 / Letter / A3 + orientation), include page fill — all wired to capture and PDF `MediaBox`

**Allowed paths:** `apps/web/**`, `docs/GRAPHIQ_BUILD_GUIDE.md`

**Done when:** toggling content mode and page fill changes export; custom crop overlay is present; page size reveals paper controls.

**Commit message:** `Add export crop page size and page fill options`

---

## 15. Later phases (not in this checklist)

- Shared project model (one Class on class + sequence)
- PlantUML / Mermaid import adapters
- XMI import/export
- Diagram-kind conversion
- Accounts, cloud, collaboration
- Code generation
- Monaco LSP

---

## 16. Quick command reference (after step 2)

```bash
pnpm install
pnpm --filter @graphiq/web dev
pnpm -r typecheck
pnpm -r test
pnpm --filter @graphiq/web build
```

Always run these locally. Deploy is not a substitute for local verification.
