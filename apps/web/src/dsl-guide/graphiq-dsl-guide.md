# GraphiQ DSL Guide

GraphiQ DSL is a text notation for supported UML 2.5.1 diagram features. You type or paste a document; GraphiQ parses it into a semantic model and renders a diagram. The DSL is **not** Mermaid, **not** PlantUML, **not** JSON, and **not** a drawing format — there are **no coordinates** (`x`, `y`, width, height) in the source. This guide describes the implemented syntax; it does not claim full UML validation.

Every document starts with a header:

```text
diagram <kind> <OptionalName>
```

`<kind>` must be one of the 14 diagram kinds listed below. Do not invent extra kinds.

## The 14 diagram kinds

| Kind string | UML diagram |
|---|---|
| `class` | Class diagram |
| `object` | Object diagram |
| `package` | Package diagram |
| `compositeStructure` | Composite structure diagram |
| `component` | Component diagram |
| `deployment` | Deployment diagram |
| `profile` | Profile diagram |
| `useCase` | Use case diagram |
| `activity` | Activity diagram |
| `stateMachine` | State machine diagram |
| `sequence` | Sequence diagram |
| `communication` | Communication diagram |
| `timing` | Timing diagram |
| `interactionOverview` | Interaction overview diagram |

## How to use this guide

1. Give this entire file to a person or an LLM.
2. Ask them to return **only** a GraphiQ DSL document (or a fenced code block) whose first line is `diagram <kind>`.
3. In GraphiQ, type the result into the DSL pane, or use **Import DSL** to load a `.md`, `.dsl`, or `.txt` file.
4. GraphiQ parses, validates, and lays out the diagram. Syntax errors and supported UML validation issues appear in the diagnostics panel.

## Rules for reliable generated code

- Use the exact keywords and arrows for the selected diagram kind. These examples describe the implemented GraphiQ syntax, not every feature of UML.
- Use identifiers such as `RequestAppointment` for node names: start with a letter or underscore, then use letters, digits, or underscores. Names are case-sensitive. Avoid keywords as identifiers.
- Keep the header and its optional title on one line. Quote a title containing spaces: `diagram activity "Hospital Appointments"`.
- Declare nodes before connecting them. Activity `initial`, `final`, and `flowFinal` endpoints can be created automatically; state machine states can also be introduced by transitions.
- Give every connected activity node a unique name across the diagram, including across partitions. Duplicate names make a reference ambiguous.
- Put declarations and flows on separate lines. A declaration keyword is not generally valid after an arrow; activity inline `decision`, `merge`, `fork`, and `join` are the documented exceptions below.
- `//` introduces a line comment; `/* ... */` introduces a block comment.
- Keep the complete document in one code block when using **Import DSL**. When typing or pasting into the DSL editor, paste the code itself without Markdown fences or explanatory prose.
- Errors show the source line and column. Click that location to open the editor and select the affected code. A syntax error leaves the previous diagram visible until the code is corrected.

Suggested instruction to an AI: "Generate one GraphiQ DSL document using only the syntax in this guide. Declare nodes explicitly, use unique identifiers, and preserve all branches and their guards. Return only the code. Check each arrow endpoint against the declarations."

## Forbidden output

Do **not** return:

- Mermaid (`classDiagram`, `flowchart`, etc.)
- PlantUML (`@startuml`, `skinparam`, etc.)
- Invented diagram kinds
- Drawing JSON or coordinate lists
- `x` / `y` positions in the DSL source

---

## Class diagram (`class`)

**Element keywords:** `class`, `interface`, `abstract class`, `enum`, `note`

**Relationship arrows:**

| Token | Meaning |
|---|---|
| `--\|>` | Generalization |
| `..\|>` | Realization |
| `-->` | Navigable association |
| `--` | Association |
| `o--` | Aggregation |
| `*--` | Composition |
| `..>` | Dependency |

**Example:**

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

---

## Object diagram (`object`)

**Element keywords:** `instance`

**Relationship arrows:** `--` (link), `..>` (dependency)

**Example:**

```text
diagram object CheckoutSnapshot

instance a: Order {
  id = "o-1"
  status = Paid
}

instance b: LineItem

a -- b : contains
```

---

## Package diagram (`package`)

**Element keywords:** `package`, `class`, `interface`, `enum`, `abstract class`

**Relationship arrows:** `..>` with `«import»` or `«merge»` stereotype labels

**Example:**

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

---

## Composite structure diagram (`compositeStructure`)

**Element keywords:** `class`, `part`, `port`, `connector`

**Relationship tokens:** `connector` … `to` …

**Example:**

```text
diagram compositeStructure CarInternals

class Car {
  part engine: Engine
  part wheels: Wheel [4]
  port power: PowerPort
}

connector c1 : engine.power to power
```

---

## Component diagram (`component`)

**Element keywords:** `component`, `provides`, `requires`, `port`, `artifact`

**Relationship tokens:** `required` … `--` … `provided` (assembly), `..>` (dependency)

**Example:**

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

---

## Deployment diagram (`deployment`)

**Element keywords:** `node`, `artifact`

**Relationship arrows:** `--` (communication path), `--|>` (generalization), `..>` (dependency)

**Example:**

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

---

## Profile diagram (`profile`)

**Element keywords:** `stereotype`, `extension`, `metaclass`, `enum`, `profile`

**Relationship arrows:** `->` (extension), `--|>` (generalization)

**Example:**

```text
diagram profile JavaProfile

stereotype Entity {
  table: String
}

extension Entity -> Class
```

---

## Use case diagram (`useCase`)

**Element keywords:** `actor`, `usecase`, `subject`

**Relationship arrows:** `--` (association), `..>` with `«include»` or `«extend»`, `--|>` (generalization)

**Example:**

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

---

## Activity diagram (`activity`)

**Element keywords:** `partition`, `action`, `object`, `initial`, `final`, `flow final`, `decision`, `merge`, `fork`, `join`

**Relationship arrow:** `-->` (control flow or object flow)

`flowFinal` is the canonical spelling; `flow final` is also accepted for declarations and endpoints. `final` stops the whole activity. `flowFinal` stops only that path.

Declare named control nodes explicitly, then connect their names:

```text
diagram activity AppointmentChoices
action CheckDoctorAvailability
decision DoctorAvailable
action AssignAppointmentSlot
decision NoSlotChoice
action SelectAnotherDoctor
action CancelBookingRequest
flowFinal cancelled

initial --> CheckDoctorAvailability
CheckDoctorAvailability --> DoctorAvailable
DoctorAvailable --> AssignAppointmentSlot : [Available]
DoctorAvailable --> NoSlotChoice : [No Slots Available]
NoSlotChoice --> SelectAnotherDoctor : [Choose another doctor]
NoSlotChoice --> CancelBookingRequest : [Cancel]
SelectAnotherDoctor --> CheckDoctorAvailability
CancelBookingRequest --> cancelled
AssignAppointmentSlot --> final
```

- Named declarations: `initial start`, `final done`, `flowFinal cancelled`, `decision Choice`, `merge Merge`, `fork Split`, `join Together`.
- Put nodes inside `partition Name { ... }` to assign them to a swimlane. Put flows outside the partition blocks. Partition names cannot be flow endpoints.
- Guards use `: [text]`, for example `: [Existing Patient]` or `: [amount > 0]`. Guard text must fit on one source line and cannot contain a closing `]`.
- Inline control-node declarations are also supported: `Check --> decision Choice`, `Confirm --> fork Split`, `Split --> join Together`. Each declares a node; later flows use `Choice`, `Split`, or `Together` alone. Do not also declare the same node separately.
- Use a decision with different guards for alternative choices; use a fork and join for concurrent work. An action with two outgoing arrows does not express a user choice. Two branches with the same guard do not identify which alternative should be chosen.

**Example:**

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

---

## State machine diagram (`stateMachine`)

**Element keywords:** `state`, `region`, `choice`, `junction`, `fork`, `join`, `[*]` (initial/final pseudostate)

**Relationship arrow:** `-->` (transition, with optional `: trigger [guard] / effect`)

**Example:**

```text
diagram stateMachine OrderLifecycle

[*] --> Draft
Draft --> Paid : pay [amount > 0] / emitReceipt
Paid --> [*]
```

---

## Sequence diagram (`sequence`)

**Element keywords:** `lifeline`, `alt`, `opt`, `loop`

**Message arrows:** `->` (synchronous), `->>` (asynchronous), `-->>` (reply), `-->` (create)

**Example:**

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

---

## Communication diagram (`communication`)

**Element keywords:** `instance`

**Relationship arrows:** `->` (numbered message), `--` (link)

**Example:**

```text
diagram communication CheckoutComm

instance customer: Customer
instance shop: Shop

customer -> shop : 1: placeOrder()
shop -> customer : 2: confirm()
```

---

## Timing diagram (`timing`)

**Element keywords:** `lifeline`, state intervals with `@` time

**Message arrows:** `->`, `->>`, `-->>`, `-->` (same as sequence)

**Example:**

```text
diagram timing Lamp

lifeline lamp: Lamp

lamp {
  Off @ 0
  On  @ 10
  Off @ 40
}
```

---

## Interaction overview diagram (`interactionOverview`)

**Element keywords:** `initial`, `final`, `ref`, `decision`, `merge`, `fork`, `join`

**Relationship arrow:** `-->` (control flow)

**Example:**

```text
diagram interactionOverview OrderFlow

initial --> ref Checkout
ref Checkout --> ref Fulfill
ref Fulfill --> final
```
