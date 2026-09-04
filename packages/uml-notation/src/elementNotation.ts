import { assertNever } from "@graphiq/uml-core";
import { ACTOR, CLASS_BOX, USE_CASE } from "./compartments.js";
import type { ElementType } from "./elementTypes.js";
import type { ElementNotation } from "./types.js";

const classifierBox: ElementNotation = {
  shape: "classifierBox",
  minWidth: CLASS_BOX.minWidth,
  minHeight: CLASS_BOX.minHeight,
};

const interfaceBox: ElementNotation = {
  ...classifierBox,
  keyword: "«interface»",
};

const enumerationBox: ElementNotation = {
  ...classifierBox,
  keyword: "«enumeration»",
};

const componentBox: ElementNotation = {
  shape: "component",
  keyword: "«component»",
  minWidth: CLASS_BOX.minWidth,
  minHeight: CLASS_BOX.minHeight,
};

const artifactBox: ElementNotation = {
  shape: "artifact",
  keyword: "«artifact»",
  minWidth: CLASS_BOX.minWidth,
  minHeight: CLASS_BOX.minHeight,
};

const profileFrame: ElementNotation = {
  shape: "profileFrame",
  keyword: "«profile»",
  minWidth: CLASS_BOX.minWidth,
  minHeight: CLASS_BOX.minHeight,
};

const stereotypeBox: ElementNotation = {
  ...classifierBox,
  keyword: "«stereotype»",
};

const node3d: ElementNotation = {
  shape: "node3d",
  minWidth: CLASS_BOX.minWidth,
  minHeight: CLASS_BOX.minHeight,
};

const instanceBox: ElementNotation = {
  shape: "classifierBox",
  minWidth: CLASS_BOX.minWidth,
  minHeight: CLASS_BOX.minHeight,
  nameUnderline: true,
};

const packageBox: ElementNotation = {
  shape: "package",
  minWidth: CLASS_BOX.minWidth,
  minHeight: CLASS_BOX.minHeight,
};

const partBox: ElementNotation = {
  shape: "part",
  minWidth: CLASS_BOX.minWidth,
  minHeight: CLASS_BOX.minHeight,
};

const portBox: ElementNotation = {
  shape: "port",
  minWidth: 16,
  minHeight: 16,
};

const noteBox: ElementNotation = {
  shape: "note",
  minWidth: 120,
  minHeight: 60,
};

const constraintBox: ElementNotation = {
  shape: "constraint",
  minWidth: 120,
  minHeight: 48,
};

const actorFigure: ElementNotation = {
  shape: "stickFigure",
  minWidth: ACTOR.width,
  minHeight: ACTOR.height,
};

const useCaseEllipse: ElementNotation = {
  shape: "ellipse",
  minWidth: USE_CASE.minWidth,
  minHeight: USE_CASE.minHeight,
};

const subjectBoundary: ElementNotation = {
  shape: "subjectBoundary",
  minWidth: 320,
  minHeight: 240,
};

const roundedAction: ElementNotation = {
  shape: "roundedRect",
  minWidth: 120,
  minHeight: 48,
};

const filledCircle: ElementNotation = {
  shape: "filledCircle",
  minWidth: 20,
  minHeight: 20,
};

const bullseye: ElementNotation = {
  shape: "bullseye",
  minWidth: 24,
  minHeight: 24,
};

const circleWithX: ElementNotation = {
  shape: "circleWithX",
  minWidth: 24,
  minHeight: 24,
};

const diamond: ElementNotation = {
  shape: "diamond",
  minWidth: 32,
  minHeight: 32,
};

const thickBar: ElementNotation = {
  shape: "thickBar",
  minWidth: 8,
  minHeight: 80,
};

const swimlane: ElementNotation = {
  shape: "swimlane",
  minWidth: 200,
  minHeight: 400,
};

const frame: ElementNotation = {
  shape: "frame",
  minWidth: CLASS_BOX.minWidth,
  minHeight: CLASS_BOX.minHeight,
};

const lifelineHead: ElementNotation = {
  shape: "lifelineHead",
  minWidth: CLASS_BOX.minWidth,
  minHeight: CLASS_BOX.nameCompartmentHeight,
};

const executionSpec: ElementNotation = {
  shape: "executionSpec",
  minWidth: 12,
  minHeight: 40,
};

const combinedFragmentFrame: ElementNotation = {
  shape: "combinedFragmentFrame",
  minWidth: 240,
  minHeight: 120,
};

const interactionUseFrame: ElementNotation = {
  shape: "interactionUseFrame",
  minWidth: 160,
  minHeight: 80,
};

const destructionX: ElementNotation = {
  shape: "destructionX",
  minWidth: 20,
  minHeight: 20,
};

const timingBand: ElementNotation = {
  shape: "timingBand",
  minWidth: 200,
  minHeight: 32,
};

const plainRect: ElementNotation = {
  shape: "plainRect",
  minWidth: CLASS_BOX.minWidth,
  minHeight: CLASS_BOX.minHeight,
};

export function getElementNotation(type: ElementType): ElementNotation {
  switch (type) {
    case "class":
    case "dataType":
    case "primitiveType":
    case "associationClass":
    case "metaclass":
      return classifierBox;
    case "interface":
      return interfaceBox;
    case "enumeration":
      return enumerationBox;
    case "note":
      return noteBox;
    case "constraint":
      return constraintBox;
    case "instanceSpecification":
      return instanceBox;
    case "package":
      return packageBox;
    case "part":
      return partBox;
    case "port":
      return portBox;
    case "collaboration":
    case "collaborationUse":
    case "deploymentSpecification":
    case "gate":
    case "stateInvariant":
    case "durationConstraint":
    case "timeConstraint":
      return plainRect;
    case "component":
      return componentBox;
    case "artifact":
      return artifactBox;
    case "node":
    case "device":
    case "executionEnvironment":
      return node3d;
    case "profile":
      return profileFrame;
    case "stereotype":
      return stereotypeBox;
    case "actor":
      return actorFigure;
    case "useCase":
      return useCaseEllipse;
    case "subject":
      return subjectBoundary;
    case "activity":
    case "stateMachine":
    case "interaction":
      return frame;
    case "action":
    case "objectNode":
      return roundedAction;
    case "initialNode":
    case "pseudostate":
      return filledCircle;
    case "activityFinalNode":
    case "finalState":
      return bullseye;
    case "flowFinalNode":
      return circleWithX;
    case "decisionNode":
    case "mergeNode":
      return diamond;
    case "forkNode":
    case "joinNode":
      return thickBar;
    case "activityPartition":
      return swimlane;
    case "interruptibleActivityRegion":
      return frame;
    case "region":
      return frame;
    case "state":
      return roundedAction;
    case "lifeline":
      return lifelineHead;
    case "executionSpecification":
      return executionSpec;
    case "combinedFragment":
      return combinedFragmentFrame;
    case "interactionUse":
      return interactionUseFrame;
    case "destructionOccurrence":
      return destructionX;
    case "timingState":
      return timingBand;
    default:
      return assertNever(type);
  }
}
