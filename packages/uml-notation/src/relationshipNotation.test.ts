import { describe, expect, it } from "vitest";
import { MESSAGE_SORTS } from "./messageSort.js";
import {
  getMessageNotation,
  getRelationshipNotation,
} from "./relationshipNotation.js";
import { RELATIONSHIP_TYPES } from "./relationshipTypes.js";

describe("getRelationshipNotation", () => {
  it("returns notation for all 28 relationship types", () => {
    expect(RELATIONSHIP_TYPES).toHaveLength(28);

    for (const type of RELATIONSHIP_TYPES) {
      const notation = getRelationshipNotation(type);
      expect(notation.lineStyle).toMatch(/^(solid|dash)$/);
    }
  });

  it("maps generalization to a solid line with a hollow triangle at the target", () => {
    expect(getRelationshipNotation("generalization")).toEqual({
      lineStyle: "solid",
      sourceMarkerId: null,
      targetMarkerId: "gen-hollow-triangle",
    });
  });

  it("maps realization to a dashed line with a realize hollow triangle at the target", () => {
    expect(getRelationshipNotation("realization")).toEqual({
      lineStyle: "dash",
      dashArray: "6 4",
      sourceMarkerId: null,
      targetMarkerId: "realize-hollow-triangle",
    });
  });

  it("maps communicationPath to a solid line with no diamond markers", () => {
    expect(getRelationshipNotation("communicationPath")).toEqual({
      lineStyle: "solid",
      sourceMarkerId: null,
      targetMarkerId: null,
    });
  });

  it("maps extension to a solid line with a filled triangle at the target", () => {
    expect(getRelationshipNotation("extension")).toEqual({
      lineStyle: "solid",
      sourceMarkerId: null,
      targetMarkerId: "ext-filled-triangle",
    });
  });

  it("maps composition to a filled diamond on the source end", () => {
    expect(getRelationshipNotation("composition")).toEqual({
      lineStyle: "solid",
      sourceMarkerId: "comp-filled-diamond",
      targetMarkerId: null,
    });
  });

  it("maps message to the default synchronous call notation", () => {
    expect(getRelationshipNotation("message")).toEqual(
      getMessageNotation("synchCall"),
    );
  });
});

describe("getMessageNotation", () => {
  it("covers every message sort", () => {
    expect(MESSAGE_SORTS).toHaveLength(6);

    for (const sort of MESSAGE_SORTS) {
      expect(getMessageNotation(sort).lineStyle).toMatch(/^(solid|dash)$/);
    }
  });

  it("uses a filled arrowhead for synchronous calls", () => {
    expect(getMessageNotation("synchCall")).toEqual({
      lineStyle: "solid",
      sourceMarkerId: null,
      targetMarkerId: "msg-sync-filled",
    });
  });

  it("uses an open arrowhead for asynchronous calls", () => {
    expect(getMessageNotation("asynchCall")).toEqual({
      lineStyle: "solid",
      sourceMarkerId: null,
      targetMarkerId: "msg-async-open",
    });
    expect(getMessageNotation("asynchSignal")).toEqual({
      lineStyle: "solid",
      sourceMarkerId: null,
      targetMarkerId: "msg-async-open",
    });
  });

  it("uses a dashed open arrowhead for replies", () => {
    expect(getMessageNotation("reply")).toEqual({
      lineStyle: "dash",
      dashArray: "6 4",
      sourceMarkerId: null,
      targetMarkerId: "msg-reply-open",
    });
  });
});
