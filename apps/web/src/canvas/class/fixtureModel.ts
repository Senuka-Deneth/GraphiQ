import type { NotationOverlay } from "@graphiq/uml-layout";
import type { UmlModel } from "@graphiq/uml-model";

export const classCanvasFixture: { model: UmlModel; overlay: NotationOverlay } = {
  model: {
    id: "fixture-doc",
    kind: "class",
    elements: [
      {
        id: "el-order",
        elementType: "class",
        name: "Order",
        isAbstract: false,
        attributes: [{ id: "a1", visibility: "private", name: "id", typeName: "UUID" }],
        operations: [
          {
            id: "o1",
            visibility: "public",
            name: "calculateTotal",
            parameters: [],
            returnType: "Float",
          },
        ],
      },
      {
        id: "el-document",
        elementType: "class",
        name: "Document",
        isAbstract: true,
        attributes: [],
        operations: [],
      },
      {
        id: "el-payable",
        elementType: "interface",
        name: "Payable",
        attributes: [],
        operations: [
          {
            id: "o2",
            visibility: "public",
            name: "pay",
            parameters: [{ name: "amount", typeName: "Money" }],
            returnType: "Boolean",
          },
        ],
      },
      {
        id: "el-order-status",
        elementType: "enumeration",
        name: "OrderStatus",
        literals: ["Draft", "Paid"],
      },
      {
        id: "el-line-item",
        elementType: "class",
        name: "LineItem",
        isAbstract: false,
        attributes: [],
        operations: [],
      },
    ],
    relationships: [
      {
        id: "rel-gen",
        relationshipType: "generalization",
        sourceId: "el-order",
        targetId: "el-document",
      },
      {
        id: "rel-comp",
        relationshipType: "composition",
        sourceId: "el-order",
        targetId: "el-line-item",
        sourceMultiplicity: "1",
        targetMultiplicity: "1",
      },
      {
        id: "rel-realize",
        relationshipType: "realization",
        sourceId: "el-order",
        targetId: "el-payable",
      },
    ],
  },
  overlay: {
    nodes: {
      "el-order": { id: "el-order", x: 80, y: 280, width: 180, height: 112 },
      "el-document": { id: "el-document", x: 80, y: 40, width: 180, height: 72 },
      "el-payable": { id: "el-payable", x: 360, y: 40, width: 180, height: 92 },
      "el-order-status": { id: "el-order-status", x: 360, y: 180, width: 180, height: 92 },
      "el-line-item": { id: "el-line-item", x: 360, y: 320, width: 180, height: 72 },
    },
    edges: {},
  },
};
