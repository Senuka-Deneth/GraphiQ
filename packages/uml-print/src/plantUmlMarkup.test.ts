import { describe, expect, it } from "vitest";
import type { UmlModel } from "@graphiq/uml-model";
import { compileDiagram } from "./compile.js";
import { printPlantUml } from "./printPlantUml.js";

function roundTrip(kind: Parameters<typeof compileDiagram>[0], text: string): UmlModel {
  const first = compileDiagram(kind, text);
  expect(first.model, first.diagnostics.map((item) => item.message).join("\n")).toBeDefined();
  if (first.model === undefined) {
    throw new Error("expected model");
  }
  const name = first.ast?.name;
  expect(first.diagnostics.filter((item) => item.severity === "error")).toEqual([]);
  const printed = printPlantUml(kind, first.model, { name });
  const second = compileDiagram(kind, printed, first.model);
  expect(second.model, second.diagnostics.map((item) => item.message).join("\n")).toBeDefined();
  if (second.model === undefined) {
    throw new Error("expected reprinted model");
  }
  expect(structural(second.model)).toEqual(structural(first.model));
  expect(printPlantUml(kind, second.model, { name: second.ast?.name })).toBe(printed);
  return first.model;
}

function structural(model: UmlModel) {
  const nameById = new Map(model.elements.map((element) => [element.id, element.name]));
  return {
    kind: model.kind,
    elements: model.elements.map((element) => ({
      type: element.elementType,
      name: element.name,
      parent: element.parentId !== undefined ? nameById.get(element.parentId) : undefined,
    })),
    relationships: model.relationships.map((relationship) => ({
      type: relationship.relationshipType,
      source: nameById.get(relationship.sourceId),
      target: nameById.get(relationship.targetId),
      name: relationship.name,
    })),
  };
}

describe("PlantUML markup", () => {
  it("maps class extension and dependency without using GraphiQ arrow tokens", () => {
    const model = roundTrip(
      "class",
      `@startuml
title OrderDomain
class Order {
  -id: UUID
  +calculateTotal(): Float
}
interface Payable
abstract class Document
enum Status {
  Draft
  Paid
}
Document <|-- Order
Payable <|.. Order
Order *-- LineItem
Order --> Mailer : uses
@enduml`,
    );
    const generalization = model.relationships.find((item) => item.relationshipType === "generalization");
    const dependency = model.relationships.find((item) => item.relationshipType === "dependency");
    const order = model.elements.find((item) => item.name === "Order");
    const document = model.elements.find((item) => item.name === "Document");
    expect(generalization?.sourceId).toBe(order?.id);
    expect(generalization?.targetId).toBe(document?.id);
    expect(dependency?.relationshipType).toBe("dependency");
    expect(model.relationships.some((item) => item.relationshipType === "navigableAssociation")).toBe(false);
  });

  it("round-trips the other diagram kinds", () => {
    roundTrip(
      "package",
      `@startuml
package billing {
  class Invoice
}
package catalog {
  class Product
}
billing ..> catalog : import
@enduml`,
    );
    roundTrip(
      "object",
      `@startuml
object order : Order
object item : LineItem
order -- item : contains
@enduml`,
    );
    roundTrip(
      "useCase",
      `@startuml
actor Customer
rectangle Shop {
  (Checkout)
  (Pay)
}
Customer -- (Checkout)
(Checkout) ..> (Pay) : <<include>>
@enduml`,
    );
    roundTrip(
      "component",
      `@startuml
component Payments
component Accounting
Payments --> Accounting
@enduml`,
    );
    roundTrip(
      "deployment",
      `@startuml
node AppCluster
database DB
AppCluster -- DB : SQL
@enduml`,
    );
    roundTrip(
      "activity",
      `@startuml
|Sales|
start
:ReceiveOrder;
|Warehouse|
:Pack;
stop
@enduml`,
    );
    const branched = roundTrip(
      "activity",
      `@startuml
start
if (ready) then (yes)
  :Pack;
else (no)
  :Cancel;
endif
fork
  :Left;
fork again
  :Right;
end fork
stop
@enduml`,
    );
    expect(branched.elements.some((element) => element.elementType === "decisionNode")).toBe(true);
    expect(branched.elements.some((element) => element.elementType === "forkNode")).toBe(true);
    expect(branched.elements.filter((element) => element.name === "Pack" || element.name === "Cancel")).toHaveLength(2);
    const states = roundTrip(
      "stateMachine",
      `@startuml
[*] --> Draft
[H] --> Draft
Draft --> Paid : pay
Paid --> [*]
@enduml`,
    );
    expect(states.elements.some((element) => element.elementType === "pseudostate" && element.kind === "shallowHistory")).toBe(true);
    roundTrip(
      "timing",
      `@startuml
robust "Lamp" as lamp
@0
lamp is Off
@10
lamp is On
@enduml`,
    );
    roundTrip(
      "communication",
      `@startuml
instance customer: Customer
instance shop: Shop
customer -> shop : 1: placeOrder()
@enduml`,
    );
    roundTrip(
      "compositeStructure",
      `@startuml
class Car {
  part engine: Engine
  port power: PowerPort
}
connector c1 : engine.power to power
@enduml`,
    );
    roundTrip(
      "profile",
      `@startuml
stereotype Entity {
  table: String
}
extension Entity -> Class
@enduml`,
    );
    roundTrip(
      "interactionOverview",
      `@startuml
initial --> ref Checkout
ref Checkout --> final
@enduml`,
    );
  });
});
