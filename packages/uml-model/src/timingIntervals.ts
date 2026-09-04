import type { TimingStateElement, UmlElement } from "./element.js";
import type { UmlModel } from "./model.js";

export type TimingInterval = {
  stateId: string;
  lifelineId: string;
  start: number;
  end: number;
};

export function isTimingStateElement(
  element: UmlElement,
): element is TimingStateElement {
  return element.elementType === "timingState";
}

function durationMaxForState(model: UmlModel, stateId: string): number | undefined {
  const duration = model.elements.find(
    (element) =>
      element.elementType === "durationConstraint" &&
      element.parentId === stateId,
  );
  if (duration?.elementType === "durationConstraint") {
    return duration.max;
  }
  return undefined;
}

export function timingIntervalsForLifeline(
  model: UmlModel,
  lifelineId: string,
): TimingInterval[] {
  const states = model.elements
    .filter(
      (element): element is TimingStateElement =>
        element.elementType === "timingState" && element.parentId === lifelineId,
    )
    .sort((left, right) => left.at - right.at);

  if (states.length === 0) {
    return [];
  }

  const maxTime = Math.max(
    ...states.map((state) => {
      const durationMax = durationMaxForState(model, state.id);
      return state.until ?? durationMax ?? state.at;
    }),
  );

  return states.map((state, index) => {
    const durationMax = durationMaxForState(model, state.id);
    const nextAt = states[index + 1]?.at;
    const end =
      state.until ??
      durationMax ??
      (nextAt !== undefined ? nextAt : maxTime);

    return {
      stateId: state.id,
      lifelineId,
      start: state.at,
      end,
    };
  });
}

export function timingIntervals(model: UmlModel): TimingInterval[] {
  const lifelines = model.elements.filter(
    (element) => element.elementType === "lifeline",
  );

  return lifelines.flatMap((lifeline) =>
    timingIntervalsForLifeline(model, lifeline.id),
  );
}

export function intervalCoversTime(
  interval: TimingInterval,
  time: number,
): boolean {
  return time >= interval.start && time < interval.end;
}
