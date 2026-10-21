import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { SEQUENCE_MARKUP_RULE_ID } from "./types.js";
import { isSequenceMarkup, parseSequenceMarkup } from "./parseSequenceMarkup.js";

const fixture = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "../fixtures/sequence-markup-devinsight.puml"),
  "utf8",
);

describe("isSequenceMarkup", () => {
  it("recognizes PlantUML and Lucid sequence markup", () => {
    expect(isSequenceMarkup("@startuml\nAlice -> Bob : hi\n@enduml")).toBe(true);
    expect(isSequenceMarkup("actor Alice\nAlice -> Bob : hi")).toBe(true);
    expect(isSequenceMarkup("Alice -> Bob")).toBe(true);
  });

  it("rejects GraphiQ DSL and Mermaid", () => {
    expect(isSequenceMarkup("diagram sequence Checkout\n\nlifeline a: A\na -> b : hi\n")).toBe(false);
    expect(isSequenceMarkup("classDiagram\n  Alpha --> Beta\n")).toBe(false);
    expect(isSequenceMarkup("sequenceDiagram\n  Alice->>Bob: hello\n")).toBe(false);
  });
});

describe("parseSequenceMarkup", () => {
  it("reads aliases, arrows, groups, notes, and activations", () => {
    const parsed = parseSequenceMarkup(`@startuml
title Checkout
actor Customer
participant "Order Service" as Shop
database "Orders" as DB
skinparam sequenceArrowThickness 2
Customer -> Shop++ : placeOrder()
Shop --> Customer : ok
alt in stock
  Shop -> DB : save
else sold out
  Shop --> Customer : sorry
end
note over Shop : packed
@enduml`);

    expect(parsed.document.title).toBe("Checkout");
    expect(parsed.document.participants.map((participant) => participant.displayName)).toEqual([
      "Customer",
      "Order Service",
      "Orders",
    ]);
    expect(parsed.document.participants[1]?.alias).toBe("Shop");
    expect(parsed.document.participants[0]?.kind).toBe("actor");
    expect(parsed.document.participants[2]?.kind).toBe("database");
    expect(parsed.diagnostics.some((diagnostic) => diagnostic.ruleId === SEQUENCE_MARKUP_RULE_ID)).toBe(
      true,
    );
    const message = parsed.document.items[0];
    expect(message?.itemKind).toBe("message");
    if (message?.itemKind === "message") {
      expect(message.messageSort).toBe("synchCall");
      expect(message.activations).toEqual([{ participant: "Shop", action: "activate" }]);
    }
    const reply = parsed.document.items[1];
    expect(reply?.itemKind).toBe("message");
    if (reply?.itemKind === "message") {
      expect(reply.messageSort).toBe("reply");
      expect(reply.source).toBe("Shop");
      expect(reply.target).toBe("Customer");
    }
    const group = parsed.document.items[2];
    expect(group?.itemKind).toBe("group");
    if (group?.itemKind === "group") {
      expect(group.operator).toBe("alt");
      expect(group.operands.map((operand) => operand.guard)).toEqual(["in stock", "sold out"]);
    }
    const note = parsed.document.items[3];
    expect(note?.itemKind).toBe("note");
    if (note?.itemKind === "note") {
      expect(note.text).toBe("packed");
      expect(note.participants).toEqual(["Shop"]);
    }
  });

  it("parses the DevInsight sample without errors", () => {
    const parsed = parseSequenceMarkup(fixture);
    expect(parsed.diagnostics.filter((diagnostic) => diagnostic.severity === "error")).toEqual([]);
    expect(parsed.document.title).toContain("DevInsight");
    expect(parsed.document.participants).toHaveLength(9);
    const operators: string[] = [];
    const visit = (items: typeof parsed.document.items) => {
      for (const item of items) {
        if (item.itemKind === "group") {
          operators.push(item.operator);
          for (const operand of item.operands) {
            visit(operand.items);
          }
        }
      }
    };
    visit(parsed.document.items);
    expect(operators).toEqual(expect.arrayContaining(["loop", "par", "alt", "opt"]));
  });

  it("splits par on and as well as else", () => {
    const parsed = parseSequenceMarkup(`par first
  A -> B : one
and second
  A -> B : two
end`);
    const group = parsed.document.items[0];
    expect(group?.itemKind).toBe("group");
    if (group?.itemKind === "group") {
      expect(group.operator).toBe("par");
      expect(group.operands.map((operand) => operand.guard)).toEqual(["first", "second"]);
    }
  });

  it("reverses leftward dashed arrows into replies", () => {
    const parsed = parseSequenceMarkup("Bob <-- Alice : done");
    const message = parsed.document.items[0];
    expect(message?.itemKind).toBe("message");
    if (message?.itemKind === "message") {
      expect(message.source).toBe("Alice");
      expect(message.target).toBe("Bob");
      expect(message.messageSort).toBe("reply");
    }
  });
});
