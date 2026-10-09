import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { DiagramKind } from "@graphiq/uml-core";
import { parse } from "./index.js";

const fixtureDir = join(dirname(fileURLToPath(import.meta.url)), "fixtures");

const fixtureKind: Record<string, DiagramKind> = {
  "activity-fulfill-order.dsl": "activity",
  "class-format-preserving.dsl": "class",
  "class-order-domain.dsl": "class",
  "communication-checkout.dsl": "communication",
  "component-shop.dsl": "component",
  "compositeStructure-car.dsl": "compositeStructure",
  "deployment-prod.dsl": "deployment",
  "interaction-overview-order-flow.dsl": "interactionOverview",
  "object-checkout.dsl": "object",
  "package-system.dsl": "package",
  "profile-java.dsl": "profile",
  "sequence-checkout.dsl": "sequence",
  "state-machine-order-lifecycle.dsl": "stateMachine",
  "timing-lamp.dsl": "timing",
  "usecase-storefront.dsl": "useCase",
};

describe("parse safety", () => {
  it("returns a result for every unfinished prefix of the diagram fixtures", () => {
    const failures: string[] = [];

    for (const fileName of readdirSync(fixtureDir)) {
      const kind = fixtureKind[fileName];
      if (kind === undefined) {
        continue;
      }
      const source = readFileSync(join(fixtureDir, fileName), "utf8");
      for (let length = 0; length <= source.length; length += 1) {
        const prefix = source.slice(0, length);
        try {
          const result = parse(kind, prefix);
          if (result.ok) {
            expect(result.value.diagnostics).toBeInstanceOf(Array);
          } else {
            expect(result.error.diagnostics.length).toBeGreaterThan(0);
          }
        } catch (error) {
          failures.push(`${fileName}@${length}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    }

    expect(failures).toEqual([]);
  });

  it("does not let an optional title consume the next line", () => {
    const result = parse("class", "diagram class\nclass Order");
    expect(result.ok).toBe(true);
    if (!result.ok || result.value.ast.kind !== "class") {
      throw new Error("expected class parse");
    }
    expect(result.value.ast.name).toBeUndefined();
    expect(result.value.ast.classifiers.map((classifier) => classifier.name)).toContain("Order");
  });

  it("reads quoted and escaped diagram titles", () => {
    const quoted = parse("class", 'diagram class "Order Domain"\nclass Order');
    expect(quoted.ok).toBe(true);
    if (!quoted.ok || quoted.value.ast.kind !== "class") {
      throw new Error("expected quoted title");
    }
    expect(quoted.value.ast.name).toBe("Order Domain");

    const escaped = parse("sequence", 'diagram sequence "Say \\"hi\\""\nlifeline a: A');
    expect(escaped.ok).toBe(true);
    if (!escaped.ok || escaped.value.ast.kind !== "sequence") {
      throw new Error("expected escaped title");
    }
    expect(escaped.value.ast.name).toBe('Say "hi"');
  });

  it("keeps mixed sequence messages and fragments in source order", () => {
    const result = parse(
      "sequence",
      `diagram sequence Mixed

lifeline a: A
lifeline b: B

a -> b : first
alt {
  [ok]
  a -> b : inside
}
a -> b : last
`,
    );
    expect(result.ok).toBe(true);
    if (!result.ok || result.value.ast.kind !== "sequence") {
      throw new Error("expected sequence parse");
    }

    expect(result.value.ast.interactions.map((item) => item.interactionKind)).toEqual([
      "message",
      "fragment",
      "message",
    ]);
    const [first, fragment, last] = result.value.ast.interactions;
    expect(first?.interactionKind === "message" ? first.message.name : undefined).toBe("first");
    expect(fragment?.interactionKind === "fragment" ? fragment.fragment.operator : undefined).toBe(
      "alt",
    );
    expect(last?.interactionKind === "message" ? last.message.name : undefined).toBe("last");
  });
});
