import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { UmlModel } from "@graphiq/uml-model";
import { compileDiagram } from "./compile.js";
import { printSequenceMarkup } from "./printSequenceMarkup.js";

const fixture = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "../../uml-dsl/src/fixtures/sequence-markup-devinsight.puml"),
  "utf8",
);

function structural(model: UmlModel) {
  const nameById = new Map(model.elements.map((element) => [element.id, element.name]));
  return {
    lifelines: model.elements.flatMap((element) =>
      element.elementType === "lifeline"
        ? [{ name: element.name, head: element.head, stereotype: element.stereotype }]
        : [],
    ),
    messages: model.relationships.flatMap((relationship) =>
      relationship.relationshipType === "message"
        ? [
            {
              source: nameById.get(relationship.sourceId),
              target: nameById.get(relationship.targetId),
              messageSort: relationship.messageSort,
              name: relationship.name,
            },
          ]
        : [],
    ),
    fragments: model.elements.flatMap((element) =>
      element.elementType === "combinedFragment"
        ? [
            {
              operator: element.operator,
              guards: element.operands.map((operand) => operand.guard),
              messageCounts: element.operands.map((operand) => operand.messageIds.length),
            },
          ]
        : [],
    ),
    notes: model.elements.flatMap((element) =>
      element.elementType === "note" ? [element.name] : [],
    ),
    activations: model.elements.flatMap((element) =>
      element.elementType === "executionSpecification"
        ? [
            {
              lifeline: element.parentId !== undefined ? nameById.get(element.parentId) : undefined,
              started: element.startMessageId !== undefined,
              finished: element.finishMessageId !== undefined,
            },
          ]
        : [],
    ),
  };
}

describe("sequence markup model", () => {
  it("maps dashed markup arrows to replies instead of create messages", () => {
    const compiled = compileDiagram(
      "sequence",
      `@startuml
Alice -> Bob : call
Bob --> Alice : done
Alice ->> Bob : ping
@enduml`,
    );
    expect(compiled.model).toBeDefined();
    if (compiled.model === undefined) {
      throw new Error("expected model");
    }
    const sorts = compiled.model.relationships.map((relationship) =>
      relationship.relationshipType === "message" ? relationship.messageSort : relationship.relationshipType,
    );
    expect(sorts).toEqual(["synchCall", "reply", "asynchCall"]);
    expect(sorts).not.toContain("createMessage");

    const unmatched = compileDiagram("sequence", "Bob --> Alice : later");
    const unmatchedSort = unmatched.model?.relationships[0];
    expect(unmatchedSort?.relationshipType).toBe("message");
    if (unmatchedSort?.relationshipType === "message") {
      expect(unmatchedSort.messageSort).toBe("asynchSignal");
    }
  });

  it("uses the visible label for aliases and draws actor and database heads", () => {
    const compiled = compileDiagram(
      "sequence",
      `participant "Order Service" as Shop
database "Orders" as DB
actor Customer
Customer -> Shop : place()`,
    );
    expect(compiled.model).toBeDefined();
    if (compiled.model === undefined) {
      throw new Error("expected model");
    }
    const lifelines = compiled.model.elements.filter((element) => element.elementType === "lifeline");
    expect(lifelines.map((lifeline) => lifeline.name)).toEqual(["Order Service", "Orders", "Customer"]);
    expect(lifelines[0]?.head).toBeUndefined();
    expect(lifelines[1]?.stereotype).toBe("database");
    expect(lifelines[2]?.head).toBe("actor");
    const message = compiled.model.relationships[0];
    expect(message?.relationshipType).toBe("message");
    if (message?.relationshipType === "message") {
      const source = lifelines.find((lifeline) => lifeline.id === message.sourceId);
      const target = lifelines.find((lifeline) => lifeline.id === message.targetId);
      expect(source?.name).toBe("Customer");
      expect(target?.name).toBe("Order Service");
    }
  });

  it("keeps explicit activations and still synthesizes bars for unmarked lifelines", () => {
    const compiled = compileDiagram(
      "sequence",
      `@startuml
Alice -> Bob : hi
activate Bob
Bob -> Carol : ask
Carol --> Bob : answer
deactivate Bob
@enduml`,
    );
    expect(compiled.model).toBeDefined();
    if (compiled.model === undefined) {
      throw new Error("expected model");
    }
    const specs = compiled.model.elements.filter(
      (element) => element.elementType === "executionSpecification",
    );
    const bob = compiled.model.elements.find((element) => element.name === "Bob");
    const carol = compiled.model.elements.find((element) => element.name === "Carol");
    const bobSpecs = specs.filter((spec) => spec.parentId === bob?.id);
    const carolSpecs = specs.filter((spec) => spec.parentId === carol?.id);
    expect(bobSpecs).toHaveLength(1);
    expect(bobSpecs[0]?.startMessageId).toBeDefined();
    expect(bobSpecs[0]?.finishMessageId).toBeDefined();
    expect(carolSpecs).toHaveLength(1);
  });

  it("compiles and reprints the DevInsight sample", () => {
    const compiled = compileDiagram("sequence", fixture);
    expect(compiled.model).toBeDefined();
    expect(compiled.ast?.kind).toBe("sequence");
    if (compiled.ast?.kind === "sequence") {
      expect(compiled.ast.name).toContain("DevInsight");
    }
    if (compiled.model === undefined) {
      throw new Error("expected model");
    }
    const shape = structural(compiled.model);
    expect(shape.lifelines.map((lifeline) => lifeline.name)).toEqual([
      "Developer",
      "Claude Code + Collector (dev PC)",
      "Jira Cloud",
      "GitHub",
      "Spring Boot Backend",
      "PostgreSQL",
      "FastAPI ML Service",
      "Notification Service",
      "HR",
    ]);
    expect(shape.lifelines[0]?.head).toBe("actor");
    expect(shape.lifelines[5]?.stereotype).toBe("database");
    const linked = shape.messages.find((message) => message.name?.includes("Task KEY linked"));
    expect(linked?.messageSort).toBe("reply");
    expect(linked?.source).toBe("Claude Code + Collector (dev PC)");
    expect(linked?.target).toBe("Developer");
    expect(shape.fragments.map((fragment) => fragment.operator)).toEqual(
      expect.arrayContaining(["loop", "par", "alt", "opt"]),
    );
    expect(shape.notes.some((note) => note.includes("06:00 Colombo"))).toBe(true);
    const collector = shape.activations.find(
      (activation) => activation.lifeline === "Claude Code + Collector (dev PC)",
    );
    expect(collector?.started).toBe(true);
    expect(collector?.finished).toBe(true);

    const reprinted = printSequenceMarkup(compiled.model, { name: compiled.ast?.name });
    const again = compileDiagram("sequence", reprinted, compiled.model);
    expect(again.model).toBeDefined();
    if (again.model === undefined) {
      throw new Error("expected reprinted model");
    }
    expect(structural(again.model)).toEqual(structural(compiled.model));
    expect(printSequenceMarkup(again.model, { name: again.ast?.name })).toBe(reprinted);
  });

  it("leaves GraphiQ sequence DSL on the existing parser", () => {
    const compiled = compileDiagram(
      "sequence",
      `diagram sequence Checkout

lifeline customer: Actor
lifeline shop: Shop

customer -> shop : placeOrder()
shop --> customer : created
`,
    );
    expect(compiled.model).toBeDefined();
    if (compiled.model === undefined) {
      throw new Error("expected model");
    }
    const created = compiled.model.relationships.find(
      (relationship) => relationship.relationshipType === "message" && relationship.name === "created",
    );
    expect(created?.relationshipType).toBe("message");
    if (created?.relationshipType === "message") {
      expect(created.messageSort).toBe("createMessage");
    }
  });
});
