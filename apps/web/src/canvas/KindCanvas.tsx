import { assertNever } from "@graphiq/uml-core";
import type { ReactElement, RefObject } from "react";
import { ActivityCanvas } from "./activity/ActivityCanvas.js";
import { CanvasModeContext, type CanvasMode } from "./canvasMode.js";
import { ClassCanvas } from "./class/ClassCanvas.js";
import { CommunicationCanvas } from "./communication/CommunicationCanvas.js";
import { ComponentCanvas } from "./component/ComponentCanvas.js";
import { CompositeStructureCanvas } from "./compositeStructure/CompositeStructureCanvas.js";
import { DeploymentCanvas } from "./deployment/DeploymentCanvas.js";
import { InteractionOverviewCanvas } from "./interactionOverview/InteractionOverviewCanvas.js";
import { ObjectCanvas } from "./object/ObjectCanvas.js";
import { PackageCanvas } from "./package/PackageCanvas.js";
import { ProfileCanvas } from "./profile/ProfileCanvas.js";
import { SequenceCanvas } from "./sequence/SequenceCanvas.js";
import { StateMachineCanvas } from "./stateMachine/StateMachineCanvas.js";
import { TimingCanvas } from "./timing/TimingCanvas.js";
import { UseCaseCanvas } from "./useCase/UseCaseCanvas.js";
import type { ImplementedDiagramKind } from "../store/documentStore.js";

export type KindCanvasProps = {
  kind: ImplementedDiagramKind;
  mode?: CanvasMode;
  onSelectedNodeChange?: (nodeId: string | null) => void;
  onSelectedEdgeChange?: (edgeId: string | null) => void;
  editMemberTriggerRef?: RefObject<HTMLButtonElement | null>;
  selectedNodeId?: string | null;
};

export function KindCanvas({
  kind,
  mode = "editor",
  onSelectedNodeChange,
  onSelectedEdgeChange,
  editMemberTriggerRef,
  selectedNodeId,
}: KindCanvasProps): ReactElement {
  return (
    <CanvasModeContext.Provider value={mode}>
      <KindCanvasSwitch
        kind={kind}
        onSelectedNodeChange={onSelectedNodeChange}
        onSelectedEdgeChange={onSelectedEdgeChange}
        editMemberTriggerRef={editMemberTriggerRef}
        selectedNodeId={selectedNodeId}
      />
    </CanvasModeContext.Provider>
  );
}

function KindCanvasSwitch({
  kind,
  onSelectedNodeChange,
  onSelectedEdgeChange,
  editMemberTriggerRef,
  selectedNodeId,
}: Omit<KindCanvasProps, "mode">): ReactElement {
  switch (kind) {
    case "class":
      return (
        <ClassCanvas
          onSelectedNodeChange={onSelectedNodeChange}
          onSelectedEdgeChange={onSelectedEdgeChange}
          editMemberTriggerRef={editMemberTriggerRef}
          selectedNodeId={selectedNodeId}
        />
      );
    case "object":
      return (
        <ObjectCanvas
          onSelectedNodeChange={onSelectedNodeChange}
          onSelectedEdgeChange={onSelectedEdgeChange}
        />
      );
    case "package":
      return (
        <PackageCanvas
          onSelectedNodeChange={onSelectedNodeChange}
          onSelectedEdgeChange={onSelectedEdgeChange}
        />
      );
    case "component":
      return (
        <ComponentCanvas
          onSelectedNodeChange={onSelectedNodeChange}
          onSelectedEdgeChange={onSelectedEdgeChange}
        />
      );
    case "deployment":
      return (
        <DeploymentCanvas
          onSelectedNodeChange={onSelectedNodeChange}
          onSelectedEdgeChange={onSelectedEdgeChange}
        />
      );
    case "profile":
      return (
        <ProfileCanvas
          onSelectedNodeChange={onSelectedNodeChange}
          onSelectedEdgeChange={onSelectedEdgeChange}
        />
      );
    case "useCase":
      return (
        <UseCaseCanvas
          onSelectedNodeChange={onSelectedNodeChange}
          onSelectedEdgeChange={onSelectedEdgeChange}
        />
      );
    case "compositeStructure":
      return (
        <CompositeStructureCanvas
          onSelectedNodeChange={onSelectedNodeChange}
          onSelectedEdgeChange={onSelectedEdgeChange}
        />
      );
    case "communication":
      return (
        <CommunicationCanvas
          onSelectedNodeChange={onSelectedNodeChange}
          onSelectedEdgeChange={onSelectedEdgeChange}
        />
      );
    case "activity":
      return (
        <ActivityCanvas
          onSelectedNodeChange={onSelectedNodeChange}
          onSelectedEdgeChange={onSelectedEdgeChange}
        />
      );
    case "stateMachine":
      return (
        <StateMachineCanvas
          onSelectedNodeChange={onSelectedNodeChange}
          onSelectedEdgeChange={onSelectedEdgeChange}
        />
      );
    case "sequence":
      return (
        <SequenceCanvas
          onSelectedNodeChange={onSelectedNodeChange}
          onSelectedEdgeChange={onSelectedEdgeChange}
        />
      );
    case "timing":
      return (
        <TimingCanvas
          onSelectedNodeChange={onSelectedNodeChange}
          onSelectedEdgeChange={onSelectedEdgeChange}
        />
      );
    case "interactionOverview":
      return (
        <InteractionOverviewCanvas
          onSelectedNodeChange={onSelectedNodeChange}
          onSelectedEdgeChange={onSelectedEdgeChange}
        />
      );
    default:
      return assertNever(kind);
  }
}
