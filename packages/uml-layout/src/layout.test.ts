import { describe, expect, it } from "vitest";
import { addElement, emptyModel } from "@graphiq/uml-model";
import { layoutDocument } from "./layoutDocument.js";
import { layoutObject } from "./layoutObject.js";
import { createClassFixtureModel, layoutClass, measureClassNode } from "./layoutClass.js";
import { emptyOverlay } from "./overlay.js";

describe("measureClassNode", () => {
  it("accounts for interface keyword and member rows", () => {
    const size = measureClassNode({
      id: "1",
      elementType: "interface",
      name: "Payable",
      attributes: [{ id: "a", visibility: "public", name: "amount", typeName: "Money" }],
      operations: [
        {
          id: "o",
          visibility: "public",
          name: "pay",
          parameters: [{ name: "amount", typeName: "Money" }],
          returnType: "Boolean",
        },
      ],
    });

    expect(size.width).toBe(180);
    expect(size.height).toBe(92);
  });
});

describe("layoutClass", () => {
  it("lays out three classes with generalization using finite coordinates", async () => {
    const model = createClassFixtureModel();
    const overlay = await layoutClass(model, emptyOverlay(), "full");

    for (const element of model.elements) {
      const node = overlay.nodes[element.id];
      expect(node).toBeDefined();
      expect(Number.isFinite(node?.x)).toBe(true);
      expect(Number.isFinite(node?.y)).toBe(true);
      expect(Number.isFinite(node?.width)).toBe(true);
      expect(Number.isFinite(node?.height)).toBe(true);
    }

    const base = overlay.nodes["class-base"];
    const middle = overlay.nodes["class-middle"];
    const leaf = overlay.nodes["class-leaf"];
    if (base === undefined || middle === undefined || leaf === undefined) {
      throw new Error("expected all fixture nodes to be positioned");
    }

    const ys = [base.y, middle.y, leaf.y];
    expect(Math.max(...ys)).toBeGreaterThan(Math.min(...ys));
  });

  it("preserves positioned nodes in incremental mode and lays out only new ids", async () => {
    const model = createClassFixtureModel();
    const firstPass = await layoutClass(model, emptyOverlay(), "full");
    const pinned = firstPass.nodes["class-base"];
    if (pinned === undefined) {
      throw new Error("expected base node");
    }

    const pinnedOverlay = {
      ...firstPass,
      nodes: {
        ...firstPass.nodes,
        "class-base": { ...pinned, x: 400, y: 120 },
      },
    };

    const withNewClass = addElement(model, {
      elementType: "class",
      name: "Added",
    });
    if (!withNewClass.ok) {
      throw new Error("expected addElement to succeed");
    }

    const updatedModel = withNewClass.value;
    const newClassId = updatedModel.elements.find((element) => element.name === "Added")?.id;
    if (newClassId === undefined) {
      throw new Error("expected new class id");
    }

    const incremental = await layoutClass(updatedModel, pinnedOverlay, "incremental");
    expect(incremental.nodes["class-base"]).toEqual(pinnedOverlay.nodes["class-base"]);

    const addedNode = incremental.nodes[newClassId];
    expect(addedNode).toBeDefined();
    expect(Number.isFinite(addedNode?.x)).toBe(true);
    expect(Number.isFinite(addedNode?.y)).toBe(true);
  });
});

describe("layoutObject", () => {
  it("lays out instances with finite coordinates left-to-right", async () => {
    let model = emptyModel("object");
    const a = addElement(model, {
      elementType: "instanceSpecification",
      name: "a",
      classifierName: "Order",
    });
    const b = addElement(a.ok ? a.value : model, {
      elementType: "instanceSpecification",
      name: "b",
      classifierName: "LineItem",
    });
    if (!a.ok || !b.ok) {
      throw new Error("expected instances");
    }
    model = b.value;

    const overlay = await layoutObject(model, emptyOverlay(), "full");
    const aId = model.elements.find((element) => element.name === "a")?.id;
    const bId = model.elements.find((element) => element.name === "b")?.id;
    const aNode = aId !== undefined ? overlay.nodes[aId] : undefined;
    const bNode = bId !== undefined ? overlay.nodes[bId] : undefined;

    for (const node of [aNode, bNode]) {
      expect(node).toBeDefined();
      expect(Number.isFinite(node?.x)).toBe(true);
      expect(Number.isFinite(node?.y)).toBe(true);
    }

    if (aNode === undefined || bNode === undefined) {
      throw new Error("expected positioned nodes");
    }
    expect(bNode.x).toBeGreaterThanOrEqual(aNode.x);
  });
});

describe("layoutPackage", () => {
  it("lays out nested package children with finite coordinates", async () => {
    let model = emptyModel("package");
    const billing = addElement(model, {
      elementType: "package",
      name: "billing",
    });
    if (!billing.ok) {
      throw new Error("expected package");
    }
    model = billing.value;
    const billingId = model.elements.find((element) => element.name === "billing")?.id;
    if (billingId === undefined) {
      throw new Error("expected billing id");
    }

    const invoice = addElement(model, {
      elementType: "class",
      name: "Invoice",
      parentId: billingId,
    });
    if (!invoice.ok) {
      throw new Error("expected class");
    }
    model = invoice.value;

    const overlay = await layoutDocument("package", model, emptyOverlay(), "first-open-empty-overlay");
    const billingNode = overlay.nodes[billingId];
    const invoiceId = model.elements.find((element) => element.name === "Invoice")?.id;
    const invoiceNode = invoiceId !== undefined ? overlay.nodes[invoiceId] : undefined;

    for (const node of [billingNode, invoiceNode]) {
      expect(node).toBeDefined();
      expect(Number.isFinite(node?.x)).toBe(true);
      expect(Number.isFinite(node?.y)).toBe(true);
      expect(Number.isFinite(node?.width)).toBe(true);
      expect(Number.isFinite(node?.height)).toBe(true);
    }
  });
});

describe("layoutComponent", () => {
  it("lays out nested interfaces inside components with finite coordinates", async () => {
    let model = emptyModel("component");
    const payments = addElement(model, {
      elementType: "component",
      name: "Payments",
    });
    if (!payments.ok) {
      throw new Error("expected component");
    }
    model = payments.value;
    const paymentsId = model.elements.find((element) => element.name === "Payments")?.id;
    if (paymentsId === undefined) {
      throw new Error("expected payments id");
    }

    const ledger = addElement(model, {
      elementType: "interface",
      name: "Ledger",
      parentId: paymentsId,
    });
    if (!ledger.ok) {
      throw new Error("expected interface");
    }
    model = ledger.value;

    const overlay = await layoutDocument("component", model, emptyOverlay(), "first-open-empty-overlay");
    const paymentsNode = overlay.nodes[paymentsId];
    const ledgerId = model.elements.find((element) => element.name === "Ledger")?.id;
    const ledgerNode = ledgerId !== undefined ? overlay.nodes[ledgerId] : undefined;

    for (const node of [paymentsNode, ledgerNode]) {
      expect(node).toBeDefined();
      expect(Number.isFinite(node?.x)).toBe(true);
      expect(Number.isFinite(node?.y)).toBe(true);
      expect(Number.isFinite(node?.width)).toBe(true);
      expect(Number.isFinite(node?.height)).toBe(true);
    }
  });
});

describe("layoutDeployment", () => {
  it("lays out a nested artifact inside a device with finite coordinates", async () => {
    let model = emptyModel("deployment");
    const cluster = addElement(model, { elementType: "device", name: "AppCluster" });
    if (!cluster.ok) {
      throw new Error("expected device");
    }
    model = cluster.value;
    const clusterId = model.elements.find((element) => element.name === "AppCluster")?.id;
    if (clusterId === undefined) {
      throw new Error("expected cluster id");
    }

    const artifact = addElement(model, {
      elementType: "artifact",
      name: "shop.war",
      parentId: clusterId,
    });
    if (!artifact.ok) {
      throw new Error("expected artifact");
    }
    model = artifact.value;

    const overlay = await layoutDocument(
      "deployment",
      model,
      emptyOverlay(),
      "first-open-empty-overlay",
    );
    const clusterNode = overlay.nodes[clusterId];
    const artifactId = model.elements.find((element) => element.name === "shop.war")?.id;
    const artifactNode = artifactId !== undefined ? overlay.nodes[artifactId] : undefined;

    for (const node of [clusterNode, artifactNode]) {
      expect(node).toBeDefined();
      expect(Number.isFinite(node?.x)).toBe(true);
      expect(Number.isFinite(node?.y)).toBe(true);
      expect(Number.isFinite(node?.width)).toBe(true);
      expect(Number.isFinite(node?.height)).toBe(true);
    }
  });
});

describe("layoutDocument", () => {
  it("throws for non-implemented diagram kinds", async () => {
    const model = emptyModel("sequence");
    await expect(
      layoutDocument("sequence", model, emptyOverlay(), "first-open-empty-overlay"),
    ).rejects.toThrow("layout not implemented for sequence");

    await expect(
      layoutDocument("useCase", emptyModel("useCase"), emptyOverlay(), "topology-changed"),
    ).rejects.toThrow("layout not implemented for useCase");
  });
});
