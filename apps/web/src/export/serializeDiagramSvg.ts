import { assertNever } from "@graphiq/uml-core";
import {
  DASH_ARRAY,
  getMessageNotation,
  getRelationshipNotation,
  MARKER_IDS,
  SVG_MARKERS,
} from "@graphiq/uml-notation";
import type { NotationOverlay } from "@graphiq/uml-layout";
import type { UmlElement, UmlModel, UmlRelationship } from "@graphiq/uml-model";
import {
  lifelineDisplayName,
  lifelineHeadHeight,
  sequenceModelToSvg,
  strokeForDiagnostic,
} from "../canvas/sequence/modelToSvg.js";
import {
  lifelineDisplayName as timingLifelineDisplayName,
  timingModelToSvg,
} from "../canvas/timing/modelToSvg.js";
import type { GraphiqDocument } from "../store/documentStore.js";

type Bounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function renderMarkerDefs(): string {
  return MARKER_IDS.map((id) => {
    const marker = SVG_MARKERS[id];
    return `<marker id="${marker.id}" viewBox="${marker.viewBox}" markerWidth="${marker.markerWidth}" markerHeight="${marker.markerHeight}" refX="${marker.refX}" refY="${marker.refY}" orient="${marker.orient}" markerUnits="strokeWidth"><path d="${marker.pathD}" fill="${marker.fill}" stroke="${marker.stroke}" stroke-width="1"/></marker>`;
  }).join("");
}

function absoluteOverlayBox(
  model: UmlModel,
  overlay: NotationOverlay,
  elementId: string,
): { x: number; y: number; width: number; height: number } | undefined {
  const node = overlay.nodes[elementId];
  if (node === undefined) {
    return undefined;
  }

  const element = model.elements.find((item) => item.id === elementId);
  if (element?.parentId === undefined) {
    return node;
  }

  const parentBox = absoluteOverlayBox(model, overlay, element.parentId);
  if (parentBox === undefined) {
    return node;
  }

  return {
    x: parentBox.x + node.x,
    y: parentBox.y + node.y,
    width: node.width,
    height: node.height,
  };
}

function elementLabel(element: UmlElement): string {
  if (element.elementType === "instanceSpecification" && element.classifierName !== undefined) {
    return `${element.name}: ${element.classifierName}`;
  }
  if (element.elementType === "lifeline" && element.classifierName !== undefined) {
    return `${element.name}: ${element.classifierName}`;
  }
  return element.name;
}

function computeBounds(
  boxes: readonly { x: number; y: number; width: number; height: number }[],
  padding = 32,
): Bounds {
  if (boxes.length === 0) {
    return { minX: 0, minY: 0, maxX: 640, maxY: 480 };
  }

  const minX = Math.min(...boxes.map((box) => box.x)) - padding;
  const minY = Math.min(...boxes.map((box) => box.y)) - padding;
  const maxX = Math.max(...boxes.map((box) => box.x + box.width)) + padding;
  const maxY = Math.max(...boxes.map((box) => box.y + box.height)) + padding;
  return { minX, minY, maxX, maxY };
}

function wrapSvg(width: number, height: number, body: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><defs>${renderMarkerDefs()}</defs>${body}</svg>`;
}

function markerAttr(id: string | null, end: "start" | "end"): string {
  if (id === null) {
    return "";
  }
  return end === "start" ? ` marker-start="url(#${id})"` : ` marker-end="url(#${id})"`;
}

function renderRelationshipLine(
  relationship: UmlRelationship,
  sourceCenter: { x: number; y: number },
  targetCenter: { x: number; y: number },
  waypoints?: readonly { x: number; y: number }[],
): string {
  const notation =
    relationship.relationshipType === "message" && relationship.messageSort !== undefined
      ? getMessageNotation(relationship.messageSort)
      : getRelationshipNotation(relationship.relationshipType);
  const dash = notation.lineStyle === "dash" ? ` stroke-dasharray="${DASH_ARRAY}"` : "";
  const points =
    waypoints !== undefined && waypoints.length >= 2
      ? waypoints
      : [sourceCenter, targetCenter];
  const pathData = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");
  const label =
    relationship.name !== undefined
      ? `<text x="${(sourceCenter.x + targetCenter.x) / 2}" y="${(sourceCenter.y + targetCenter.y) / 2 - 6}" text-anchor="middle" font-size="12" fill="#334155">${escapeXml(relationship.name)}</text>`
      : "";
  return `<path d="${pathData}" fill="none" stroke="#0f172a" stroke-width="1.5"${dash}${markerAttr(notation.sourceMarkerId, "start")}${markerAttr(notation.targetMarkerId, "end")}/>${label}`;
}

function renderFlowDiagramSvg(model: UmlModel, overlay: NotationOverlay): string {
  const boxes = model.elements.flatMap((element) => {
    const box = absoluteOverlayBox(model, overlay, element.id);
    return box === undefined ? [] : [box];
  });
  const bounds = computeBounds(boxes);
  const width = bounds.maxX - bounds.minX;
  const height = bounds.maxY - bounds.minY;
  const offsetX = -bounds.minX;
  const offsetY = -bounds.minY;

  const nodeMarkup = model.elements.flatMap((element) => {
    const box = absoluteOverlayBox(model, overlay, element.id);
    if (box === undefined) {
      return [];
    }
    const x = box.x + offsetX;
    const y = box.y + offsetY;
    const label = elementLabel(element);
    const fill = element.elementType === "note" ? "#fffbeb" : "#ffffff";
    const stroke = element.elementType === "note" ? "#f59e0b" : "#334155";
    const shapeMarkup =
      element.elementType === "useCase"
        ? `<ellipse cx="${x + box.width / 2}" cy="${y + box.height / 2}" rx="${box.width / 2}" ry="${box.height / 2}" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>`
        : `<rect x="${x}" y="${y}" width="${box.width}" height="${box.height}" fill="${fill}" stroke="${stroke}" stroke-width="1.5" rx="2"/>`;
    const underlineAttr =
      element.elementType === "instanceSpecification" ? ' text-decoration="underline"' : "";
    return [
      shapeMarkup,
      `<text x="${x + box.width / 2}" y="${y + box.height / 2 + 4}" text-anchor="middle" font-size="12" fill="#0f172a"${underlineAttr}>${escapeXml(label)}</text>`,
    ];
  });

  const edgeMarkup = model.relationships.flatMap((relationship) => {
    const sourceBox = absoluteOverlayBox(model, overlay, relationship.sourceId);
    const targetBox = absoluteOverlayBox(model, overlay, relationship.targetId);
    if (sourceBox === undefined || targetBox === undefined) {
      return [];
    }
    const sourceCenter = {
      x: sourceBox.x + sourceBox.width / 2 + offsetX,
      y: sourceBox.y + sourceBox.height / 2 + offsetY,
    };
    const targetCenter = {
      x: targetBox.x + targetBox.width / 2 + offsetX,
      y: targetBox.y + targetBox.height / 2 + offsetY,
    };
    const waypoints = overlay.edges[relationship.id]?.waypoints?.map((point) => ({
      x: point.x + offsetX,
      y: point.y + offsetY,
    }));
    return [renderRelationshipLine(relationship, sourceCenter, targetCenter, waypoints)];
  });

  return wrapSvg(width, height, `${nodeMarkup.join("")}${edgeMarkup.join("")}`);
}

function renderSequenceDiagramSvg(model: UmlModel, overlay: NotationOverlay): string {
  const renderable = sequenceModelToSvg(model, overlay, []);
  const headHeight = lifelineHeadHeight();
  const body = [
    ...renderable.combinedFragments.map(
      (fragment) =>
        `<rect x="${fragment.x}" y="${fragment.y}" width="${fragment.width}" height="${fragment.height}" fill="rgba(255,255,255,0.6)" stroke="#64748b" stroke-dasharray="6 4"/><text x="${fragment.x + 8}" y="${fragment.y + 16}" font-size="12" fill="#334155">${escapeXml(fragment.operator)}</text>`,
    ),
    ...renderable.lifelines.flatMap((lifeline) => {
      const stroke = strokeForDiagnostic(lifeline.diagnosticSeverity) ?? "#334155";
      return [
        `<line x1="${lifeline.centerX}" y1="${lifeline.y + headHeight}" x2="${lifeline.centerX}" y2="${lifeline.y + lifeline.height}" stroke="#64748b" stroke-dasharray="6 4"/>`,
        `<rect x="${lifeline.x}" y="${lifeline.y}" width="${lifeline.width}" height="${headHeight}" fill="#ffffff" stroke="${stroke}"/>`,
        `<text x="${lifeline.x + lifeline.width / 2}" y="${lifeline.y + headHeight / 2 + 4}" text-anchor="middle" font-size="12" fill="#0f172a">${escapeXml(lifelineDisplayName(lifeline))}</text>`,
      ];
    }),
    ...renderable.executionSpecs.map(
      (execution) =>
        `<rect x="${execution.x}" y="${execution.y}" width="${execution.width}" height="${execution.height}" fill="#e2e8f0" stroke="#94a3b8"/>`,
    ),
    ...renderable.messages.map((message) => {
      const dash = message.lineStyle === "dash" ? ` stroke-dasharray="${DASH_ARRAY}"` : "";
      const label =
        message.label !== undefined
          ? `<text x="${(message.x1 + message.x2) / 2}" y="${message.y - 6}" text-anchor="middle" font-size="12" fill="#334155">${escapeXml(message.label)}</text>`
          : "";
      return `<line x1="${message.x1}" y1="${message.y}" x2="${message.x2}" y2="${message.y}" stroke="#0f172a" stroke-width="1.5" marker-end="url(#${message.markerId})"${dash}/>${label}`;
    }),
  ].join("");
  return wrapSvg(renderable.width, renderable.height, body);
}

function renderTimingDiagramSvg(model: UmlModel, overlay: NotationOverlay): string {
  const renderable = timingModelToSvg(model, overlay, []);
  const body = [
    `<line x1="32" y1="${renderable.axisY}" x2="${renderable.width - 32}" y2="${renderable.axisY}" stroke="#64748b"/>`,
    ...renderable.ticks.map(
      (tick) =>
        `<line x1="${tick.x}" y1="${renderable.axisY - 4}" x2="${tick.x}" y2="${renderable.axisY + 4}" stroke="#64748b"/><text x="${tick.x}" y="${renderable.axisY + 16}" text-anchor="middle" font-size="11" fill="#64748b">${tick.time}</text>`,
    ),
    ...renderable.lifelines.map((lifeline) => {
      const stroke = strokeForDiagnostic(lifeline.diagnosticSeverity) ?? "#334155";
      return `<rect x="${lifeline.x}" y="${lifeline.y}" width="${lifeline.width}" height="${lifeline.height}" fill="#ffffff" stroke="${stroke}"/><text x="${lifeline.x + lifeline.width / 2}" y="${lifeline.rowCenterY + 4}" text-anchor="middle" font-size="12" fill="#0f172a">${escapeXml(timingLifelineDisplayName(lifeline))}</text>`;
    }),
    ...renderable.states.map(
      (state) =>
        `<rect x="${state.x}" y="${state.y}" width="${state.width}" height="${state.height}" fill="#e2e8f0" stroke="#334155"/><text x="${state.x + state.width / 2}" y="${state.y + state.height / 2 + 4}" text-anchor="middle" font-size="11" fill="#0f172a">${escapeXml(state.name)}</text>`,
    ),
    ...renderable.messages.map((message) => {
      const dash = message.lineStyle === "dash" ? ` stroke-dasharray="${DASH_ARRAY}"` : "";
      return `<line x1="${message.x}" y1="${message.y1}" x2="${message.x}" y2="${message.y2}" stroke="#0f172a" stroke-width="1.5" marker-end="url(#${message.markerId})"${dash}/>`;
    }),
  ].join("");
  return wrapSvg(renderable.width, renderable.height, body);
}

export function serializeDiagramSvg(document: GraphiqDocument): string {
  const { kind, model, overlay } = document;

  switch (kind) {
    case "class":
    case "object":
    case "package":
    case "component":
    case "deployment":
    case "profile":
    case "useCase":
    case "compositeStructure":
    case "communication":
    case "activity":
    case "stateMachine":
    case "interactionOverview":
      return renderFlowDiagramSvg(model, overlay);
    case "sequence":
      return renderSequenceDiagramSvg(model, overlay);
    case "timing":
      return renderTimingDiagramSvg(model, overlay);
    default:
      return assertNever(kind);
  }
}
