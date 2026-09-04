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

describe("layoutProfile", () => {
  it("lays out a stereotype and metaclass with finite coordinates", async () => {
    let model = emptyModel("profile");
    const entity = addElement(model, { elementType: "stereotype", name: "Entity" });
    if (!entity.ok) {
      throw new Error("expected stereotype");
    }
    model = entity.value;
    const metaclass = addElement(model, { elementType: "metaclass", name: "Class" });
    if (!metaclass.ok) {
      throw new Error("expected metaclass");
    }
    model = metaclass.value;

    const overlay = await layoutDocument(
      "profile",
      model,
      emptyOverlay(),
      "first-open-empty-overlay",
    );
    const entityId = model.elements.find((element) => element.name === "Entity")?.id;
    const classId = model.elements.find((element) => element.name === "Class")?.id;
    const entityNode = entityId !== undefined ? overlay.nodes[entityId] : undefined;
    const classNode = classId !== undefined ? overlay.nodes[classId] : undefined;

    for (const node of [entityNode, classNode]) {
      expect(node).toBeDefined();
      expect(Number.isFinite(node?.x)).toBe(true);
      expect(Number.isFinite(node?.y)).toBe(true);
      expect(Number.isFinite(node?.width)).toBe(true);
      expect(Number.isFinite(node?.height)).toBe(true);
    }
  });
});

describe("layoutUseCase", () => {
  it("places actors outside the subject boundary", async () => {
    let model = emptyModel("useCase");
    const subject = addElement(model, { elementType: "subject", name: "Shop" });
    if (!subject.ok) {
      throw new Error("expected subject");
    }
    model = subject.value;
    const subjectId = model.elements.find((element) => element.name === "Shop")?.id;
    if (subjectId === undefined) {
      throw new Error("expected subject id");
    }

    const checkout = addElement(model, {
      elementType: "useCase",
      name: "Checkout",
      parentId: subjectId,
    });
    if (!checkout.ok) {
      throw new Error("expected use case");
    }
    model = checkout.value;

    const customer = addElement(model, { elementType: "actor", name: "Customer" });
    if (!customer.ok) {
      throw new Error("expected actor");
    }
    model = customer.value;

    const overlay = await layoutDocument(
      "useCase",
      model,
      emptyOverlay(),
      "first-open-empty-overlay",
    );

    const actorNode = overlay.nodes[customer.value.elements.find((e) => e.name === "Customer")!.id];
    const subjectNode = overlay.nodes[subjectId];
    expect(actorNode).toBeDefined();
    expect(subjectNode).toBeDefined();
    if (actorNode && subjectNode) {
      expect(actorNode.x + actorNode.width).toBeLessThanOrEqual(subjectNode.x);
    }
  });
});

describe("layoutCompositeStructure", () => {
  it("places frame, parts, and border ports with finite coordinates", async () => {
    let model = emptyModel("compositeStructure");
    const car = addElement(model, {
      elementType: "class",
      name: "Car",
      isAbstract: false,
      attributes: [],
      operations: [],
    });
    if (!car.ok) {
      throw new Error("failed to add car");
    }
    model = car.value;

    const engine = addElement(model, {
      elementType: "part",
      name: "engine",
      typeName: "Engine",
      parentId: model.elements[0]!.id,
    });
    if (!engine.ok) {
      throw new Error("failed to add engine");
    }
    model = engine.value;

    const power = addElement(model, {
      elementType: "port",
      name: "power",
      parentId: model.elements[0]!.id,
    });
    if (!power.ok) {
      throw new Error("failed to add power port");
    }
    model = power.value;

    const overlay = await layoutDocument(
      "compositeStructure",
      model,
      emptyOverlay(),
      "first-open-empty-overlay",
    );

    const frameId = model.elements.find((element) => element.name === "Car")?.id;
    const portId = model.elements.find((element) => element.name === "power")?.id;
    expect(frameId).toBeDefined();
    expect(portId).toBeDefined();

    const carNode = frameId ? overlay.nodes[frameId] : undefined;
    const portNode = portId ? overlay.nodes[portId] : undefined;
    expect(carNode).toBeDefined();
    expect(portNode).toBeDefined();
    if (carNode && portNode) {
      expect(Number.isFinite(carNode.x)).toBe(true);
      const onBorder =
        portNode.x <= 0 || portNode.x + portNode.width >= carNode.width - 1;
      expect(onBorder).toBe(true);
    }
  });
});

describe("layoutDocument", () => {
  it("throws for non-implemented diagram kinds", async () => {
    const model = emptyModel("sequence");
    await expect(
      layoutDocument("sequence", model, emptyOverlay(), "first-open-empty-overlay"),
    ).rejects.toThrow("layout not implemented for sequence");
  });
});
