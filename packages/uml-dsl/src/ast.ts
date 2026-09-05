import type { RelationshipType, Visibility } from "@graphiq/uml-model";

export type DslSpan = {
  start: number;
  end: number;
};

export type DslComment = {
  kind: "line" | "block";
  image: string;
  span: DslSpan;
};

export type AstAttribute = {
  visibility: Visibility;
  name: string;
  typeName: string;
  multiplicity?: string;
  defaultValue?: string;
  span: DslSpan;
};

export type AstOperationParameter = {
  name: string;
  typeName: string;
};

export type AstOperation = {
  visibility: Visibility;
  name: string;
  parameters: AstOperationParameter[];
  returnType?: string;
  span: DslSpan;
};

export type AstClassClassifier = {
  classifierKind: "class";
  name: string;
  nameSpan: DslSpan;
  isAbstract: boolean;
  attributes: AstAttribute[];
  operations: AstOperation[];
  span: DslSpan;
};

export type AstInterfaceClassifier = {
  classifierKind: "interface";
  name: string;
  nameSpan: DslSpan;
  attributes: AstAttribute[];
  operations: AstOperation[];
  span: DslSpan;
};

export type AstEnumerationClassifier = {
  classifierKind: "enumeration";
  name: string;
  nameSpan: DslSpan;
  literals: string[];
  span: DslSpan;
};

export type AstClassifier =
  | AstClassClassifier
  | AstInterfaceClassifier
  | AstEnumerationClassifier;

export type AstRelationship = {
  sourceName: string;
  sourceNameSpan: DslSpan;
  targetName: string;
  targetNameSpan: DslSpan;
  relationshipType: RelationshipType;
  sourceMultiplicity?: string;
  targetMultiplicity?: string;
  name?: string;
  span: DslSpan;
};

export type ClassDiagramAst = {
  kind: "class";
  name?: string;
  classifiers: AstClassifier[];
  relationships: AstRelationship[];
  span: DslSpan;
};

export type AstSlot = {
  featureName: string;
  value: string;
  span: DslSpan;
};

export type AstInstance = {
  name: string;
  classifierName: string;
  slots: AstSlot[];
  span: DslSpan;
};

export type AstObjectRelationship = {
  sourceName: string;
  targetName: string;
  relationshipType: Extract<RelationshipType, "link" | "dependency">;
  name?: string;
  span: DslSpan;
};

export type ObjectDiagramAst = {
  kind: "object";
  name?: string;
  instances: AstInstance[];
  relationships: AstObjectRelationship[];
  span: DslSpan;
};

export type AstPackageBodyItem =
  | {
      itemKind: "nestedPackage";
      name: string;
      items: AstPackageBodyItem[];
      span: DslSpan;
    }
  | {
      itemKind: "classifier";
      classifier: AstClassifier;
      span: DslSpan;
    };

export type AstPackageDeclaration = {
  name: string;
  items: AstPackageBodyItem[];
  span: DslSpan;
};

export type AstPackageRelationship = {
  sourceName: string;
  targetName: string;
  relationshipType: Extract<
    RelationshipType,
    "packageImport" | "packageMerge" | "dependency"
  >;
  span: DslSpan;
};

export type PackageDiagramAst = {
  kind: "package";
  name?: string;
  packages: AstPackageDeclaration[];
  relationships: AstPackageRelationship[];
  span: DslSpan;
};

export type AstComponentBodyItem =
  | {
      itemKind: "provides";
      name: string;
      span: DslSpan;
    }
  | {
      itemKind: "requires";
      name: string;
      span: DslSpan;
    }
  | {
      itemKind: "port";
      name: string;
      span: DslSpan;
    }
  | {
      itemKind: "artifact";
      name: string;
      span: DslSpan;
    };

export type AstComponentDeclaration = {
  name: string;
  items: AstComponentBodyItem[];
  span: DslSpan;
};

export type AstComponentRelationship =
  | {
      relationshipKind: "assembly";
      sourceComponentName: string;
      sourceInterfaceName: string;
      targetInterfaceName: string;
      targetComponentName: string;
      span: DslSpan;
    }
  | {
      relationshipKind: "dependency";
      sourceName: string;
      targetName: string;
      span: DslSpan;
    }
  | {
      relationshipKind: "delegation";
      sourceName: string;
      targetName: string;
      span: DslSpan;
    };

export type ComponentDiagramAst = {
  kind: "component";
  name?: string;
  components: AstComponentDeclaration[];
  relationships: AstComponentRelationship[];
  span: DslSpan;
};

export type AstDeploymentNodeKind = "node" | "device" | "executionEnvironment";

export type AstDeploymentBodyItem = {
  itemKind: "artifact";
  name: string;
  span: DslSpan;
};

export type AstDeploymentNode = {
  name: string;
  nodeKind: AstDeploymentNodeKind;
  items: AstDeploymentBodyItem[];
  span: DslSpan;
};

export type AstDeploymentRelationship =
  | {
      relationshipKind: "communicationPath";
      sourceName: string;
      targetName: string;
      name?: string;
      span: DslSpan;
    }
  | {
      relationshipKind: "deployment";
      sourceName: string;
      targetName: string;
      span: DslSpan;
    }
  | {
      relationshipKind: "generalization";
      sourceName: string;
      targetName: string;
      span: DslSpan;
    };

export type DeploymentDiagramAst = {
  kind: "deployment";
  name?: string;
  nodes: AstDeploymentNode[];
  relationships: AstDeploymentRelationship[];
  span: DslSpan;
};

export type AstTaggedValue = {
  name: string;
  typeName: string;
  span: DslSpan;
};

export type AstStereotypeDeclaration = {
  name: string;
  attributes: AstTaggedValue[];
  span: DslSpan;
};

export type AstMetaclassDeclaration = {
  name: string;
  span: DslSpan;
};

export type AstProfileFrameDeclaration = {
  name: string;
  span: DslSpan;
};

export type AstProfileEnumeration = {
  name: string;
  literals: string[];
  span: DslSpan;
};

export type AstProfileRelationship =
  | {
      relationshipKind: "extension";
      sourceName: string;
      targetName: string;
      span: DslSpan;
    }
  | {
      relationshipKind: "generalization";
      sourceName: string;
      targetName: string;
      span: DslSpan;
    };

export type ProfileDiagramAst = {
  kind: "profile";
  name?: string;
  stereotypes: AstStereotypeDeclaration[];
  metaclasses: AstMetaclassDeclaration[];
  profiles: AstProfileFrameDeclaration[];
  enumerations: AstProfileEnumeration[];
  relationships: AstProfileRelationship[];
  span: DslSpan;
};

export type AstActorDeclaration = {
  name: string;
  span: DslSpan;
};

export type AstUseCaseDeclaration = {
  name: string;
  span: DslSpan;
};

export type AstSubjectDeclaration = {
  name: string;
  useCases: AstUseCaseDeclaration[];
  span: DslSpan;
};

export type AstUseCaseRelationship = {
  sourceName: string;
  targetName: string;
  relationshipType: Extract<
    RelationshipType,
    "association" | "include" | "extend" | "generalization" | "dependency"
  >;
  span: DslSpan;
};

export type UseCaseDiagramAst = {
  kind: "useCase";
  name?: string;
  actors: AstActorDeclaration[];
  subjects: AstSubjectDeclaration[];
  useCases: AstUseCaseDeclaration[];
  relationships: AstUseCaseRelationship[];
  span: DslSpan;
};

export type AstCompositeStructureBodyItem =
  | {
      itemKind: "part";
      name: string;
      typeName: string;
      multiplicity?: string;
      span: DslSpan;
    }
  | {
      itemKind: "port";
      name: string;
      typeName?: string;
      span: DslSpan;
    };

export type AstCompositeStructureFrame = {
  frameKind: "class" | "component";
  name: string;
  items: AstCompositeStructureBodyItem[];
  span: DslSpan;
};

export type AstCompositeStructureConnector = {
  name: string;
  sourceEnd: { rootName: string; portName?: string };
  targetEnd: { rootName: string; portName?: string };
  span: DslSpan;
};

export type CompositeStructureDiagramAst = {
  kind: "compositeStructure";
  name?: string;
  frames: AstCompositeStructureFrame[];
  connectors: AstCompositeStructureConnector[];
  span: DslSpan;
};

export type AstCommunicationMessage = {
  sourceName: string;
  targetName: string;
  sequenceNumber: string;
  messageName?: string;
  span: DslSpan;
};

export type AstCommunicationLink = {
  sourceName: string;
  targetName: string;
  name?: string;
  span: DslSpan;
};

export type CommunicationDiagramAst = {
  kind: "communication";
  name?: string;
  instances: AstInstance[];
  messages: AstCommunicationMessage[];
  links: AstCommunicationLink[];
  span: DslSpan;
};

export type AstActivityNodeKind =
  | "action"
  | "objectNode"
  | "initialNode"
  | "activityFinalNode"
  | "flowFinalNode"
  | "decisionNode"
  | "mergeNode"
  | "forkNode"
  | "joinNode";

export type AstActivityNode = {
  nodeKind: AstActivityNodeKind;
  name: string;
  span: DslSpan;
};

export type AstActivityPartition = {
  name: string;
  items: AstActivityBodyItem[];
  span: DslSpan;
};

export type AstActivityInterruptible = {
  name: string;
  items: AstActivityBodyItem[];
  span: DslSpan;
};

export type AstActivityBodyItem =
  | { itemKind: "node"; node: AstActivityNode }
  | { itemKind: "partition"; partition: AstActivityPartition }
  | { itemKind: "interruptible"; region: AstActivityInterruptible };

export type AstActivityFlow = {
  sourceName: string;
  targetName: string;
  guard?: string;
  span: DslSpan;
};

export type ActivityDiagramAst = {
  kind: "activity";
  name?: string;
  partitions: AstActivityPartition[];
  interruptibles: AstActivityInterruptible[];
  nodes: AstActivityNode[];
  flows: AstActivityFlow[];
  span: DslSpan;
};

export type AstPseudostateKind =
  | "choice"
  | "junction"
  | "fork"
  | "join"
  | "shallowHistory"
  | "deepHistory"
  | "terminate";

export type AstPseudostateDeclaration = {
  pseudostateKind: AstPseudostateKind;
  name: string;
  span: DslSpan;
};

export type AstStateDeclaration = {
  name: string;
  entry?: string;
  do?: string;
  exit?: string;
  items: AstStateMachineBodyItem[];
  span: DslSpan;
};

export type AstRegionDeclaration = {
  name: string;
  items: AstStateMachineBodyItem[];
  span: DslSpan;
};

export type AstStateMachineTransition = {
  sourceName: string;
  targetName: string;
  sourceIsStar: boolean;
  targetIsStar: boolean;
  trigger?: string;
  guard?: string;
  effect?: string;
  span: DslSpan;
};

export type AstStateMachineBodyItem =
  | { itemKind: "state"; state: AstStateDeclaration }
  | { itemKind: "region"; region: AstRegionDeclaration }
  | { itemKind: "pseudostate"; pseudostate: AstPseudostateDeclaration }
  | { itemKind: "transition"; transition: AstStateMachineTransition };

export type StateMachineDiagramAst = {
  kind: "stateMachine";
  name?: string;
  items: AstStateMachineBodyItem[];
  transitions: AstStateMachineTransition[];
  span: DslSpan;
};

export type AstSequenceLifeline = {
  name: string;
  classifierName?: string;
  span: DslSpan;
};

export type AstSequenceMessageSort =
  | "synchCall"
  | "asynchCall"
  | "reply"
  | "createMessage";

export type AstSequenceMessage = {
  sourceName: string;
  targetName: string;
  messageSort: AstSequenceMessageSort;
  name?: string;
  span: DslSpan;
};

export type AstSequenceCombinedFragmentOperator = "alt" | "opt" | "loop";

export type AstSequenceCombinedFragmentOperand = {
  guard?: string;
  messages: AstSequenceMessage[];
  span: DslSpan;
};

export type AstSequenceCombinedFragment = {
  operator: AstSequenceCombinedFragmentOperator;
  operands: AstSequenceCombinedFragmentOperand[];
  span: DslSpan;
};

export type SequenceDiagramAst = {
  kind: "sequence";
  name?: string;
  lifelines: AstSequenceLifeline[];
  combinedFragments: AstSequenceCombinedFragment[];
  messages: AstSequenceMessage[];
  span: DslSpan;
};

export type AstTimingStateConstraint =
  | { constraintKind: "duration"; min: number; max: number; span: DslSpan }
  | { constraintKind: "time"; time: number; span: DslSpan };

export type AstTimingState = {
  name: string;
  at: number;
  constraint?: AstTimingStateConstraint;
  span: DslSpan;
};

export type AstTimingStateBlock = {
  lifelineName: string;
  states: AstTimingState[];
  span: DslSpan;
};

export type AstTimingMessageSort =
  | "synchCall"
  | "asynchCall"
  | "reply"
  | "createMessage";

export type AstTimingMessage = {
  sourceName: string;
  targetName: string;
  at: number;
  messageSort: AstTimingMessageSort;
  name?: string;
  span: DslSpan;
};

export type TimingDiagramAst = {
  kind: "timing";
  name?: string;
  lifelines: AstSequenceLifeline[];
  stateBlocks: AstTimingStateBlock[];
  messages: AstTimingMessage[];
  span: DslSpan;
};

export type AstInteractionOverviewNodeKind =
  | "interactionUse"
  | "initialNode"
  | "activityFinalNode"
  | "decisionNode"
  | "mergeNode"
  | "forkNode"
  | "joinNode";

export type AstInteractionOverviewNode = {
  nodeKind: AstInteractionOverviewNodeKind;
  name: string;
  span: DslSpan;
};

export type AstInteractionOverviewFlow = {
  sourceName: string;
  targetName: string;
  sourceIsRef: boolean;
  targetIsRef: boolean;
  guard?: string;
  span: DslSpan;
};

export type InteractionOverviewDiagramAst = {
  kind: "interactionOverview";
  name?: string;
  nodes: AstInteractionOverviewNode[];
  flows: AstInteractionOverviewFlow[];
  span: DslSpan;
};

export type DiagramAst =
  | ClassDiagramAst
  | ObjectDiagramAst
  | PackageDiagramAst
  | ComponentDiagramAst
  | DeploymentDiagramAst
  | ProfileDiagramAst
  | UseCaseDiagramAst
  | CompositeStructureDiagramAst
  | CommunicationDiagramAst
  | ActivityDiagramAst
  | StateMachineDiagramAst
  | SequenceDiagramAst
  | TimingDiagramAst
  | InteractionOverviewDiagramAst;
