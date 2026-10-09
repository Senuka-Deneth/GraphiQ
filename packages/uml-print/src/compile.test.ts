import { describe, expect, it } from "vitest";
import { parse } from "@graphiq/uml-dsl";
import {
  AMBIGUOUS_REFERENCE_RULE_ID,
  DUPLICATE_DECLARATION_RULE_ID,
  UNRESOLVED_REFERENCE_RULE_ID,
} from "./identity.js";
import { astToModel } from "./astToModel.js";
import { compileDiagram } from "./compile.js";
import { print } from "./print.js";

const scopedPackages = `diagram package Scoped

package billing {
  class Order
}

package shipping {
  class Order
}
`;

describe("compileDiagram", () => {
  it("keeps same-named classifiers in different packages distinct across reparses", () => {
    const first = compileDiagram("package", scopedPackages);
    const second = compileDiagram("package", scopedPackages, first.model);
    expect(first.diagnostics.filter((item) => item.ruleId === DUPLICATE_DECLARATION_RULE_ID)).toEqual(
      [],
    );
    const orders = (model: NonNullable<typeof first.model>) =>
      model.elements.filter((element) => element.elementType === "class" && element.name === "Order");

    expect(first.model).toBeDefined();
    expect(second.model).toBeDefined();
    if (first.model === undefined || second.model === undefined) {
      throw new Error("expected models");
    }
    expect(orders(first.model)).toHaveLength(2);
    expect(new Set(orders(first.model).map((element) => element.id)).size).toBe(2);
    expect(orders(second.model).map((element) => element.id).sort()).toEqual(
      orders(first.model).map((element) => element.id).sort(),
    );
    const parents = orders(first.model).map((element) => element.parentId);
    expect(new Set(parents).size).toBe(2);
  });

  it("keeps repeated combined fragments one-to-one", () => {
    const source = `diagram sequence Fragments

lifeline a: A
lifeline b: B

alt {
  [ok]
  a -> b : one
}
alt {
  [ok]
  a -> b : two
}
`;
    const first = compileDiagram("sequence", source);
    const second = compileDiagram("sequence", source, first.model);
    expect(first.model).toBeDefined();
    expect(second.model).toBeDefined();
    if (first.model === undefined || second.model === undefined) {
      throw new Error("expected sequence models");
    }
    const fragments = (model: NonNullable<typeof first.model>) =>
      model.elements.filter((element) => element.elementType === "combinedFragment");
    expect(fragments(first.model)).toHaveLength(2);
    expect(new Set(fragments(first.model).map((element) => element.id)).size).toBe(2);
    expect(fragments(second.model).map((element) => element.id)).toEqual(
      fragments(first.model).map((element) => element.id),
    );
  });

  it("prints mixed sequence interactions in source order and round-trips them", () => {
    const source = `diagram sequence Mixed

lifeline a: A
lifeline b: B

a -> b : first
alt {
  [ok]
  a -> b : inside
}
a -> b : last
`;
    const compiled = compileDiagram("sequence", source);
    expect(compiled.model).toBeDefined();
    if (compiled.model === undefined) {
      throw new Error("expected model");
    }
    const printed = print("sequence", compiled.model, { name: "Mixed" });
    const firstAt = printed.indexOf("first");
    const insideAt = printed.indexOf("inside");
    const lastAt = printed.indexOf("last");
    expect(firstAt).toBeGreaterThan(-1);
    expect(firstAt).toBeLessThan(insideAt);
    expect(insideAt).toBeLessThan(lastAt);

    const reparsed = parse("sequence", printed);
    expect(reparsed.ok).toBe(true);
    if (!reparsed.ok || reparsed.value.ast.kind !== "sequence") {
      throw new Error("expected reparse");
    }
    expect(reparsed.value.ast.interactions.map((item) => item.interactionKind)).toEqual([
      "message",
      "fragment",
      "message",
    ]);
    const recompiled = astToModel(reparsed.value.ast, compiled.model);
    const names = recompiled.relationships.map((relationship) =>
      relationship.relationshipType === "message" ? relationship.name : undefined,
    );
    expect(names).toEqual(["first", "inside", "last"]);
  });

  it("keeps use-case dependencies and reports unresolved names at the reference", () => {
    const source = `diagram useCase Store

actor Customer
usecase Checkout
usecase Pay
Customer -- Missing
Checkout ..> Pay : «trace»
`;
    const compiled = compileDiagram("useCase", source);
    expect(compiled.model).toBeDefined();
    if (compiled.model === undefined) {
      throw new Error("expected use case model");
    }
    expect(
      compiled.model.relationships.some(
        (relationship) =>
          relationship.relationshipType === "dependency" && relationship.name === "trace",
      ),
    ).toBe(true);
    const unresolved = compiled.diagnostics.find(
      (diagnostic) => diagnostic.ruleId === UNRESOLVED_REFERENCE_RULE_ID,
    );
    expect(unresolved?.message).toContain("Missing");
    expect(unresolved?.dslSpan).toBeDefined();
    const printed = print("useCase", compiled.model, { name: "Store" });
    expect(printed).toContain("«trace»");
  });

  it("reports duplicate declarations in one scope and ambiguous references", () => {
    const compiled = compileDiagram(
      "class",
      `diagram class Dup

class Order
class Order
Order --> Order
`,
    );
    expect(compiled.diagnostics.some((item) => item.ruleId === DUPLICATE_DECLARATION_RULE_ID)).toBe(
      true,
    );
    expect(compiled.diagnostics.some((item) => item.ruleId === AMBIGUOUS_REFERENCE_RULE_ID)).toBe(
      true,
    );
    expect(compiled.sourceMap.entries.some((entry) => entry.kind === "element")).toBe(true);
  });
});
