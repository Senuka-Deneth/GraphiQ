import { assertNever } from "@graphiq/uml-core";
import { DASH_ARRAY } from "./compartments.js";
import type { MessageSort } from "./messageSort.js";
import type { RelationshipType } from "./relationshipTypes.js";
import type { RelationshipNotation } from "./types.js";

function solidLine(
  sourceMarkerId: RelationshipNotation["sourceMarkerId"] = null,
  targetMarkerId: RelationshipNotation["targetMarkerId"] = null,
  keyword?: string,
): RelationshipNotation {
  return {
    lineStyle: "solid",
    sourceMarkerId,
    targetMarkerId,
    ...(keyword !== undefined ? { keyword } : {}),
  };
}

function dashedLine(
  sourceMarkerId: RelationshipNotation["sourceMarkerId"] = null,
  targetMarkerId: RelationshipNotation["targetMarkerId"] = null,
  keyword?: string,
): RelationshipNotation {
  return {
    lineStyle: "dash",
    dashArray: DASH_ARRAY,
    sourceMarkerId,
    targetMarkerId,
    ...(keyword !== undefined ? { keyword } : {}),
  };
}

export function getMessageNotation(sort: MessageSort): RelationshipNotation {
  switch (sort) {
    case "synchCall":
      return solidLine(null, "msg-sync-filled");
    case "asynchCall":
    case "asynchSignal":
      return solidLine(null, "msg-async-open");
    case "reply":
      return dashedLine(null, "msg-reply-open");
    case "createMessage":
      return dashedLine(null, "msg-async-open");
    case "deleteMessage":
      return solidLine(null, "msg-sync-filled");
    default:
      return assertNever(sort);
  }
}

export function getRelationshipNotation(
  type: RelationshipType,
): RelationshipNotation {
  switch (type) {
    case "association":
    case "link":
    case "nestedClassifier":
    case "containment":
    case "connector":
    case "assemblyConnector":
    case "delegationConnector":
    case "communicationPath":
      return solidLine();
    case "navigableAssociation":
      return solidLine(null, "assoc-open");
    case "aggregation":
      return solidLine("agg-hollow-diamond", null);
    case "composition":
      return solidLine("comp-filled-diamond", null);
    case "generalization":
      return solidLine(null, "gen-hollow-triangle");
    case "realization":
    case "interfaceRealization":
    case "componentRealization":
      return dashedLine(null, "realize-hollow-triangle");
    case "extension":
      return solidLine(null, "ext-filled-triangle");
    case "dependency":
      return dashedLine(null, "dep-open");
    case "usage":
      return dashedLine(null, "dep-open", "«use»");
    case "packageImport":
      return dashedLine(null, "dep-open", "«import»");
    case "packageMerge":
      return dashedLine(null, "dep-open", "«merge»");
    case "deployment":
      return dashedLine(null, "dep-open", "«deploy»");
    case "manifestation":
      return dashedLine(null, "dep-open", "«manifest»");
    case "include":
      return dashedLine(null, "dep-open", "«include»");
    case "extend":
      return dashedLine(null, "dep-open", "«extend»");
    case "controlFlow":
    case "objectFlow":
    case "transition":
      return solidLine();
    case "message":
      return getMessageNotation("synchCall");
    default:
      return assertNever(type);
  }
}
