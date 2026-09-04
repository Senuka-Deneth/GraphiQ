import { createId } from "@graphiq/uml-core";
import type { Diagnostic } from "@graphiq/uml-core";
import {
  timingIntervalsForLifeline,
  type UmlModel,
} from "@graphiq/uml-model";
import type { UmlRule } from "../../types.js";

const RULE_ID = "tm.intervals-non-overlapping-per-lifeline";

function intervalsOverlap(
  leftStart: number,
  leftEnd: number,
  rightStart: number,
  rightEnd: number,
): boolean {
  return leftStart < rightEnd && rightStart < leftEnd;
}

export const timingIntervalsNonOverlappingRule: UmlRule = {
  id: RULE_ID,
  diagramKinds: ["timing"],
  severity: "error",
  check(model: UmlModel): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];
    const lifelines = model.elements.filter(
      (element) => element.elementType === "lifeline",
    );

    for (const lifeline of lifelines) {
      const states = model.elements.filter(
        (element) =>
          element.elementType === "timingState" &&
          element.parentId === lifeline.id,
      );

      const atCounts = new Map<number, string[]>();
      for (const state of states) {
        if (state.elementType !== "timingState") {
          continue;
        }
        const existing = atCounts.get(state.at) ?? [];
        existing.push(state.id);
        atCounts.set(state.at, existing);
      }

      for (const [at, stateIds] of atCounts) {
        if (stateIds.length > 1) {
          for (const stateId of stateIds) {
            diagnostics.push({
              id: createId(),
              ruleId: RULE_ID,
              severity: "error",
              message: `Multiple timing states start at time ${at} on lifeline "${lifeline.name}"`,
              elementIds: [stateId, lifeline.id],
            });
          }
        }
      }

      const intervals = timingIntervalsForLifeline(model, lifeline.id);
      for (let leftIndex = 0; leftIndex < intervals.length; leftIndex += 1) {
        for (
          let rightIndex = leftIndex + 1;
          rightIndex < intervals.length;
          rightIndex += 1
        ) {
          const left = intervals[leftIndex];
          const right = intervals[rightIndex];
          if (left === undefined || right === undefined) {
            continue;
          }

          if (
            intervalsOverlap(left.start, left.end, right.start, right.end) &&
            !(left.end === right.start || right.end === left.start)
          ) {
            diagnostics.push({
              id: createId(),
              ruleId: RULE_ID,
              severity: "error",
              message: `Overlapping timing intervals on lifeline "${lifeline.name}"`,
              elementIds: [left.stateId, right.stateId, lifeline.id],
            });
          }
        }
      }
    }

    return diagnostics;
  },
};
