import { assertNever, err, ok } from "@graphiq/uml-core";
import type { DiagramKind, Diagnostic, Result } from "@graphiq/uml-core";
import type { CstNode } from "chevrotain";
import type { ClassDiagramAst, ComponentDiagramAst, DeploymentDiagramAst, DiagramAst, DslComment, ObjectDiagramAst, PackageDiagramAst, ProfileDiagramAst, UseCaseDiagramAst } from "./ast.js";
import {
  KIND_MISMATCH_RULE_ID,
  headerParseDiagnostic,
  kindMismatchDiagnostic,
  lexerErrorToDiagnostic,
  parserErrorToDiagnostic,
} from "./diagnostics.js";
import { parseClassCst, parseClassDocument } from "./grammars/class.js";
import { parseComponentCst, parseComponentDocument } from "./grammars/component.js";
import { parseDeploymentCst, parseDeploymentDocument } from "./grammars/deployment.js";
import { parseObjectCst, parseObjectDocument } from "./grammars/object.js";
import { parsePackageCst, parsePackageDocument } from "./grammars/package.js";
import { parseProfileCst, parseProfileDocument } from "./grammars/profile.js";
import { parseUseCaseCst, parseUseCaseDocument } from "./grammars/useCase.js";
import {
  parseCompositeStructureCst,
  parseCompositeStructureDocument,
} from "./grammars/compositeStructure.js";
import {
  parseCommunicationCst,
  parseCommunicationDocument,
} from "./grammars/communication.js";
import { parseActivityCst, parseActivityDocument } from "./grammars/activity.js";
import { parseStateMachineCst, parseStateMachineDocument } from "./grammars/stateMachine.js";
import { parseSequenceCst, parseSequenceDocument } from "./grammars/sequence.js";
import { parseTimingCst, parseTimingDocument } from "./grammars/timing.js";
import {
  parseInteractionOverviewCst,
  parseInteractionOverviewDocument,
} from "./grammars/interactionOverview.js";

export type ParseSuccess = {
  ast: DiagramAst;
  cst: CstNode;
  comments: DslComment[];
  diagnostics: Diagnostic[];
};

export type ParseFailure = {
  diagnostics: Diagnostic[];
};

export function parse(
  kind: DiagramKind,
  text: string,
): Result<ParseSuccess, ParseFailure> {
  switch (kind) {
    case "class":
      return parseClass(kind, text);
    case "object":
      return parseObject(kind, text);
    case "package":
      return parsePackage(kind, text);
    case "component":
      return parseComponent(kind, text);
    case "deployment":
      return parseDeployment(kind, text);
    case "profile":
      return parseProfile(kind, text);
    case "useCase":
      return parseUseCase(kind, text);
    case "compositeStructure":
      return parseCompositeStructure(kind, text);
    case "communication":
      return parseCommunication(kind, text);
    case "activity":
      return parseActivity(kind, text);
    case "stateMachine":
      return parseStateMachine(kind, text);
    case "sequence":
      return parseSequence(kind, text);
    case "timing":
      return parseTiming(kind, text);
    case "interactionOverview":
      return parseInteractionOverview(kind, text);
    default:
      return assertNever(kind);
  }
}

function parseClass(
  expectedKind: "class",
  text: string,
): Result<ParseSuccess, ParseFailure> {
  const headerMismatch = detectHeaderKindMismatch(text, expectedKind);
  if (headerMismatch) {
    return err({ diagnostics: [headerMismatch] });
  }

  const { cst, lexerErrors, parserErrors, comments } = parseClassCst(text);
  const diagnostics: Diagnostic[] = [
    ...lexerErrors.map(lexerErrorToDiagnostic),
    ...parserErrors.map(parserErrorToDiagnostic),
  ];

  const hasHeader = cst.children.DiagramKeyword !== undefined;
  if (!hasHeader) {
    return err({
      diagnostics:
        diagnostics.length > 0
          ? diagnostics
          : [headerParseDiagnostic("Expected diagram header")],
    });
  }

  const ast = parseClassDocument(cst);

  return ok({
    ast,
    cst,
    comments,
    diagnostics,
  });
}

function parseObject(
  expectedKind: "object",
  text: string,
): Result<ParseSuccess, ParseFailure> {
  const headerMismatch = detectHeaderKindMismatch(text, expectedKind);
  if (headerMismatch) {
    return err({ diagnostics: [headerMismatch] });
  }

  const { cst, lexerErrors, parserErrors, comments } = parseObjectCst(text);
  const diagnostics: Diagnostic[] = [
    ...lexerErrors.map(lexerErrorToDiagnostic),
    ...parserErrors.map(parserErrorToDiagnostic),
  ];

  const hasHeader = cst.children.DiagramKeyword !== undefined;
  if (!hasHeader) {
    return err({
      diagnostics:
        diagnostics.length > 0
          ? diagnostics
          : [headerParseDiagnostic("Expected diagram header")],
    });
  }

  const ast = parseObjectDocument(cst);
  const completeInstances = ast.instances.filter((instance) =>
    instanceDeclarationHasColon(text, instance),
  );

  return ok({
    ast: {
      ...ast,
      instances: completeInstances,
    },
    cst,
    comments,
    diagnostics,
  });
}

function instanceDeclarationHasColon(text: string, instance: ObjectDiagramAst["instances"][number]): boolean {
  const snippet = text.slice(instance.span.start, instance.span.end);
  return /:\s*[A-Za-z_]/.test(snippet);
}

function parsePackage(
  expectedKind: "package",
  text: string,
): Result<ParseSuccess, ParseFailure> {
  const headerMismatch = detectHeaderKindMismatch(text, expectedKind);
  if (headerMismatch) {
    return err({ diagnostics: [headerMismatch] });
  }

  const { cst, lexerErrors, parserErrors, comments } = parsePackageCst(text);
  const diagnostics: Diagnostic[] = [
    ...lexerErrors.map(lexerErrorToDiagnostic),
    ...parserErrors.map(parserErrorToDiagnostic),
  ];

  const hasHeader = cst.children.DiagramKeyword !== undefined;
  if (!hasHeader) {
    return err({
      diagnostics:
        diagnostics.length > 0
          ? diagnostics
          : [headerParseDiagnostic("Expected diagram header")],
    });
  }

  const ast = parsePackageDocument(cst);

  return ok({
    ast,
    cst,
    comments,
    diagnostics,
  });
}

function parseComponent(
  expectedKind: "component",
  text: string,
): Result<ParseSuccess, ParseFailure> {
  const headerMismatch = detectHeaderKindMismatch(text, expectedKind);
  if (headerMismatch) {
    return err({ diagnostics: [headerMismatch] });
  }

  const { cst, lexerErrors, parserErrors, comments } = parseComponentCst(text);
  const diagnostics: Diagnostic[] = [
    ...lexerErrors.map(lexerErrorToDiagnostic),
    ...parserErrors.map(parserErrorToDiagnostic),
  ];

  const hasHeader = cst.children.DiagramKeyword !== undefined;
  if (!hasHeader) {
    return err({
      diagnostics:
        diagnostics.length > 0
          ? diagnostics
          : [headerParseDiagnostic("Expected diagram header")],
    });
  }

  const ast = parseComponentDocument(cst);

  return ok({
    ast,
    cst,
    comments,
    diagnostics,
  });
}

function parseDeployment(
  expectedKind: "deployment",
  text: string,
): Result<ParseSuccess, ParseFailure> {
  const headerMismatch = detectHeaderKindMismatch(text, expectedKind);
  if (headerMismatch) {
    return err({ diagnostics: [headerMismatch] });
  }

  const { cst, lexerErrors, parserErrors, comments } = parseDeploymentCst(text);
  const diagnostics: Diagnostic[] = [
    ...lexerErrors.map(lexerErrorToDiagnostic),
    ...parserErrors.map(parserErrorToDiagnostic),
  ];

  const hasHeader = cst.children.DiagramKeyword !== undefined;
  if (!hasHeader) {
    return err({
      diagnostics:
        diagnostics.length > 0
          ? diagnostics
          : [headerParseDiagnostic("Expected diagram header")],
    });
  }

  const ast = parseDeploymentDocument(cst);

  return ok({
    ast,
    cst,
    comments,
    diagnostics,
  });
}

function parseProfile(
  expectedKind: "profile",
  text: string,
): Result<ParseSuccess, ParseFailure> {
  const headerMismatch = detectHeaderKindMismatch(text, expectedKind);
  if (headerMismatch) {
    return err({ diagnostics: [headerMismatch] });
  }

  const { cst, lexerErrors, parserErrors, comments } = parseProfileCst(text);
  const diagnostics: Diagnostic[] = [
    ...lexerErrors.map(lexerErrorToDiagnostic),
    ...parserErrors.map(parserErrorToDiagnostic),
  ];

  const hasHeader = cst.children.DiagramKeyword !== undefined;
  if (!hasHeader) {
    return err({
      diagnostics:
        diagnostics.length > 0
          ? diagnostics
          : [headerParseDiagnostic("Expected diagram header")],
    });
  }

  const ast = parseProfileDocument(cst);

  return ok({
    ast,
    cst,
    comments,
    diagnostics,
  });
}

function parseUseCase(
  expectedKind: "useCase",
  text: string,
): Result<ParseSuccess, ParseFailure> {
  const headerMismatch = detectHeaderKindMismatch(text, expectedKind);
  if (headerMismatch) {
    return err({ diagnostics: [headerMismatch] });
  }

  const { cst, lexerErrors, parserErrors, comments } = parseUseCaseCst(text);
  const diagnostics: Diagnostic[] = [
    ...lexerErrors.map(lexerErrorToDiagnostic),
    ...parserErrors.map(parserErrorToDiagnostic),
  ];

  const hasHeader = cst.children.DiagramKeyword !== undefined;
  if (!hasHeader) {
    return err({
      diagnostics:
        diagnostics.length > 0
          ? diagnostics
          : [headerParseDiagnostic("Expected diagram header")],
    });
  }

  const ast = parseUseCaseDocument(cst);

  return ok({
    ast,
    cst,
    comments,
    diagnostics,
  });
}

function parseCompositeStructure(
  expectedKind: "compositeStructure",
  text: string,
): Result<ParseSuccess, ParseFailure> {
  const headerMismatch = detectHeaderKindMismatch(text, expectedKind);
  if (headerMismatch) {
    return err({ diagnostics: [headerMismatch] });
  }

  const { cst, lexerErrors, parserErrors, comments } = parseCompositeStructureCst(text);
  const diagnostics: Diagnostic[] = [
    ...lexerErrors.map(lexerErrorToDiagnostic),
    ...parserErrors.map(parserErrorToDiagnostic),
  ];

  const hasHeader = cst.children.DiagramKeyword !== undefined;
  if (!hasHeader) {
    return err({
      diagnostics:
        diagnostics.length > 0
          ? diagnostics
          : [headerParseDiagnostic("Expected diagram header")],
    });
  }

  const ast = parseCompositeStructureDocument(cst);

  return ok({
    ast,
    cst,
    comments,
    diagnostics,
  });
}

function parseCommunication(
  expectedKind: "communication",
  text: string,
): Result<ParseSuccess, ParseFailure> {
  const headerMismatch = detectHeaderKindMismatch(text, expectedKind);
  if (headerMismatch) {
    return err({ diagnostics: [headerMismatch] });
  }

  const { cst, lexerErrors, parserErrors, comments } = parseCommunicationCst(text);
  const diagnostics: Diagnostic[] = [
    ...lexerErrors.map(lexerErrorToDiagnostic),
    ...parserErrors.map(parserErrorToDiagnostic),
  ];

  const hasHeader = cst.children.DiagramKeyword !== undefined;
  if (!hasHeader) {
    return err({
      diagnostics:
        diagnostics.length > 0
          ? diagnostics
          : [headerParseDiagnostic("Expected diagram header")],
    });
  }

  const ast = parseCommunicationDocument(cst);

  return ok({
    ast,
    cst,
    comments,
    diagnostics,
  });
}

function parseActivity(
  expectedKind: "activity",
  text: string,
): Result<ParseSuccess, ParseFailure> {
  const headerMismatch = detectHeaderKindMismatch(text, expectedKind);
  if (headerMismatch) {
    return err({ diagnostics: [headerMismatch] });
  }

  const { cst, lexerErrors, parserErrors, comments } = parseActivityCst(text);
  const diagnostics: Diagnostic[] = [
    ...lexerErrors.map(lexerErrorToDiagnostic),
    ...parserErrors.map(parserErrorToDiagnostic),
  ];

  const hasHeader = cst.children.DiagramKeyword !== undefined;
  if (!hasHeader) {
    return err({
      diagnostics:
        diagnostics.length > 0
          ? diagnostics
          : [headerParseDiagnostic("Expected diagram header")],
    });
  }

  const ast = parseActivityDocument(cst);

  return ok({
    ast,
    cst,
    comments,
    diagnostics,
  });
}

function parseStateMachine(
  expectedKind: "stateMachine",
  text: string,
): Result<ParseSuccess, ParseFailure> {
  const headerMismatch = detectHeaderKindMismatch(text, expectedKind);
  if (headerMismatch) {
    return err({ diagnostics: [headerMismatch] });
  }

  const { cst, lexerErrors, parserErrors, comments } = parseStateMachineCst(text);
  const diagnostics: Diagnostic[] = [
    ...lexerErrors.map(lexerErrorToDiagnostic),
    ...parserErrors.map(parserErrorToDiagnostic),
  ];

  const hasHeader = cst.children.DiagramKeyword !== undefined;
  if (!hasHeader) {
    return err({
      diagnostics:
        diagnostics.length > 0
          ? diagnostics
          : [headerParseDiagnostic("Expected diagram header")],
    });
  }

  const ast = parseStateMachineDocument(cst);

  return ok({
    ast,
    cst,
    comments,
    diagnostics,
  });
}

function parseSequence(
  expectedKind: "sequence",
  text: string,
): Result<ParseSuccess, ParseFailure> {
  const headerMismatch = detectHeaderKindMismatch(text, expectedKind);
  if (headerMismatch) {
    return err({ diagnostics: [headerMismatch] });
  }

  const { cst, lexerErrors, parserErrors, comments } = parseSequenceCst(text);
  const diagnostics: Diagnostic[] = [
    ...lexerErrors.map(lexerErrorToDiagnostic),
    ...parserErrors.map(parserErrorToDiagnostic),
  ];

  const hasHeader = cst.children.DiagramKeyword !== undefined;
  if (!hasHeader) {
    return err({
      diagnostics:
        diagnostics.length > 0
          ? diagnostics
          : [headerParseDiagnostic("Expected diagram header")],
    });
  }

  const ast = parseSequenceDocument(cst);

  return ok({
    ast,
    cst,
    comments,
    diagnostics,
  });
}

function parseTiming(
  expectedKind: "timing",
  text: string,
): Result<ParseSuccess, ParseFailure> {
  const headerMismatch = detectHeaderKindMismatch(text, expectedKind);
  if (headerMismatch) {
    return err({ diagnostics: [headerMismatch] });
  }

  const { cst, lexerErrors, parserErrors, comments } = parseTimingCst(text);
  const diagnostics: Diagnostic[] = [
    ...lexerErrors.map(lexerErrorToDiagnostic),
    ...parserErrors.map(parserErrorToDiagnostic),
  ];

  const hasHeader = cst.children.DiagramKeyword !== undefined;
  if (!hasHeader) {
    return err({
      diagnostics:
        diagnostics.length > 0
          ? diagnostics
          : [headerParseDiagnostic("Expected diagram header")],
    });
  }

  const ast = parseTimingDocument(cst);

  return ok({
    ast,
    cst,
    comments,
    diagnostics,
  });
}

function parseInteractionOverview(
  expectedKind: "interactionOverview",
  text: string,
): Result<ParseSuccess, ParseFailure> {
  const headerMismatch = detectHeaderKindMismatch(text, expectedKind);
  if (headerMismatch) {
    return err({ diagnostics: [headerMismatch] });
  }

  const { cst, lexerErrors, parserErrors, comments } = parseInteractionOverviewCst(text);
  const diagnostics: Diagnostic[] = [
    ...lexerErrors.map(lexerErrorToDiagnostic),
    ...parserErrors.map(parserErrorToDiagnostic),
  ];

  const hasHeader = cst.children.DiagramKeyword !== undefined;
  if (!hasHeader) {
    return err({
      diagnostics:
        diagnostics.length > 0
          ? diagnostics
          : [headerParseDiagnostic("Expected diagram header")],
    });
  }

  const ast = parseInteractionOverviewDocument(cst);

  return ok({
    ast,
    cst,
    comments,
    diagnostics,
  });
}

function detectHeaderKindMismatch(
  text: string,
  expectedKind: DiagramKind,
): Diagnostic | null {
  const match = /^\s*diagram\s+([A-Za-z_][A-Za-z0-9_]*)/.exec(text);
  if (!match) {
    return null;
  }

  const actualKind = match[1];
  if (!actualKind || actualKind === expectedKind) {
    return null;
  }

  const start = match.index + match[0].indexOf(actualKind);
  return {
    ...kindMismatchDiagnostic(expectedKind, actualKind),
    ruleId: KIND_MISMATCH_RULE_ID,
    dslSpan: {
      start,
      end: start + actualKind.length,
    },
  };
}

export type {
  ClassDiagramAst,
  ComponentDiagramAst,
  DeploymentDiagramAst,
  ObjectDiagramAst,
  PackageDiagramAst,
  ProfileDiagramAst,
  UseCaseDiagramAst,
  DiagramAst,
};
