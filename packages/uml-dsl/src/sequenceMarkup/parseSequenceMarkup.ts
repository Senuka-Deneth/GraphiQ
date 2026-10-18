import { createId, type Diagnostic } from "@graphiq/uml-core";
import type { DslSpan } from "../ast.js";
import {
  SEQUENCE_MARKUP_RULE_ID,
  type SequenceMarkupActivationMarker,
  type SequenceMarkupDocument,
  type SequenceMarkupGroup,
  type SequenceMarkupGroupOperator,
  type SequenceMarkupItem,
  type SequenceMarkupMessageSort,
  type SequenceMarkupNote,
  type SequenceMarkupOperand,
  type SequenceMarkupParticipant,
  type SequenceMarkupParticipantKind,
} from "./types.js";

export type SequenceMarkupParseResult = {
  document: SequenceMarkupDocument;
  diagnostics: Diagnostic[];
};

type Statement = {
  text: string;
  start: number;
  end: number;
};

type Frame = {
  kind: "root" | "group" | "skip";
  operator?: SequenceMarkupGroupOperator;
  operands: SequenceMarkupOperand[];
  spanStart: number;
};

const PARTICIPANT_KINDS = [
  "participant",
  "actor",
  "boundary",
  "control",
  "entity",
  "database",
  "collections",
  "queue",
] as const;

const GROUP_OPERATORS = ["alt", "opt", "loop", "par"] as const;

const SKIP_GROUPS = ["group", "break", "critical", "box"] as const;

const ARROWS = ["<<--", "-->>", "<--", "-->", "<<-", "->>", "<-", "->"] as const;

const MERMAID_HEADERS =
  /^(?:classDiagram|sequenceDiagram|flowchart|graph|erDiagram|stateDiagram(?:-v2)?|gitGraph|pie|journey|gantt|mindmap|timeline|quadrantChart|requirementDiagram|C4Context)\b/;

function warning(message: string, span: DslSpan): Diagnostic {
  return {
    id: createId(),
    ruleId: SEQUENCE_MARKUP_RULE_ID,
    severity: "warning",
    message,
    elementIds: [],
    dslSpan: span,
  };
}

function spanOf(statement: Statement): DslSpan {
  return { start: statement.start, end: statement.end };
}

function scanStatements(source: string): Statement[] {
  const statements: Statement[] = [];
  let index = 0;
  let buffer = "";
  let bufferStart = 0;
  let inBlock = false;

  const pushBuffer = (end: number) => {
    const trimmedEnd = buffer.replace(/\s+$/, "");
    const leading = trimmedEnd.length - trimmedEnd.trimStart().length;
    const text = trimmedEnd.trim();
    if (text.length > 0) {
      statements.push({
        text,
        start: bufferStart + leading,
        end,
      });
    }
    buffer = "";
  };

  while (index < source.length) {
    if (!inBlock && source.startsWith("/'", index)) {
      inBlock = true;
      index += 2;
      continue;
    }
    if (inBlock) {
      if (source.startsWith("'/", index)) {
        inBlock = false;
        index += 2;
        continue;
      }
      if (source[index] === "\n") {
        pushBuffer(index);
        index += 1;
        bufferStart = index;
        continue;
      }
      index += 1;
      continue;
    }
    if (source[index] === "\r") {
      index += 1;
      continue;
    }
    if (source[index] === "'" && !bufferIncludesOpenQuote(buffer)) {
      while (index < source.length && source[index] !== "\n") {
        index += 1;
      }
      continue;
    }
    if (source[index] === "\n") {
      pushBuffer(index);
      index += 1;
      bufferStart = index;
      continue;
    }
    if (buffer.length === 0) {
      bufferStart = index;
    }
    buffer += source[index];
    index += 1;
  }
  pushBuffer(source.length);
  return statements;
}

function bufferIncludesOpenQuote(buffer: string): boolean {
  let open = false;
  for (const character of buffer) {
    if (character === '"') {
      open = !open;
    }
  }
  return open;
}

function isIdentifier(name: string): boolean {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(name);
}

function readName(input: string): { name: string; rest: string } | null {
  const trimmed = input.trimStart();
  if (trimmed.startsWith('"')) {
    let value = "";
    for (let index = 1; index < trimmed.length; index += 1) {
      const character = trimmed[index];
      if (character === "\\" && index + 1 < trimmed.length) {
        value += trimmed[index + 1];
        index += 1;
        continue;
      }
      if (character === '"') {
        return { name: value, rest: trimmed.slice(index + 1) };
      }
      value += character;
    }
    return null;
  }
  const match = /^[A-Za-z_][A-Za-z0-9_]*/.exec(trimmed);
  if (match?.[0] === undefined) {
    return null;
  }
  return { name: match[0], rest: trimmed.slice(match[0].length) };
}

function stripTrailingColor(text: string): { text: string; colored: boolean } {
  const match = /^(.*?)(\s+#[A-Za-z0-9]+)\s*$/.exec(text);
  if (match?.[1] === undefined || match[1].trim().length === 0) {
    return { text, colored: false };
  }
  return { text: match[1], colored: true };
}

function keywordOf(text: string): { keyword: string; rest: string } {
  const match = /^([A-Za-z@][A-Za-z0-9-]*)\b\s*([\s\S]*)$/.exec(text);
  if (match?.[1] === undefined) {
    return { keyword: "", rest: text };
  }
  return { keyword: match[1], rest: match[2] ?? "" };
}

function findArrow(line: string): { index: number; arrow: (typeof ARROWS)[number] } | null {
  let inQuote = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      inQuote = !inQuote;
      continue;
    }
    if (inQuote) {
      continue;
    }
    for (const arrow of ARROWS) {
      if (line.startsWith(arrow, index)) {
        return { index, arrow };
      }
    }
  }
  return null;
}

function messageSortFor(arrow: string): SequenceMarkupMessageSort {
  if (arrow.includes("--")) {
    return "reply";
  }
  if (arrow.includes(">>") || arrow.includes("<<")) {
    return "asynchCall";
  }
  return "synchCall";
}

function splitLabel(line: string): { head: string; label?: string } {
  let inQuote = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      inQuote = !inQuote;
      continue;
    }
    if (character === ":" && !inQuote) {
      const label = line.slice(index + 1).trim();
      return {
        head: line.slice(0, index).trim(),
        ...(label.length > 0 ? { label: unwrapLabel(label) } : {}),
      };
    }
  }
  return { head: line.trim() };
}

function unwrapLabel(label: string): string {
  if (label.startsWith('"') && label.endsWith('"') && label.length >= 2) {
    return label.slice(1, -1);
  }
  return label;
}

function readEndpoint(raw: string): { name: string; marker?: "++" | "--" } | null {
  let text = raw.trim();
  let marker: "++" | "--" | undefined;
  if (text.endsWith("++")) {
    marker = "++";
    text = text.slice(0, -2).trim();
  } else if (text.endsWith("--")) {
    marker = "--";
    text = text.slice(0, -2).trim();
  }
  const name = readName(text);
  if (name === null || name.rest.trim().length > 0) {
    return null;
  }
  return { name: name.name, ...(marker !== undefined ? { marker } : {}) };
}

function isParticipantKind(keyword: string): keyword is SequenceMarkupParticipantKind {
  return (PARTICIPANT_KINDS as readonly string[]).includes(keyword);
}

function isGroupOperator(keyword: string): keyword is SequenceMarkupGroupOperator {
  return (GROUP_OPERATORS as readonly string[]).includes(keyword);
}

function isSkipGroup(keyword: string): boolean {
  return (SKIP_GROUPS as readonly string[]).includes(keyword);
}

function isMermaidHeader(text: string): boolean {
  return MERMAID_HEADERS.test(text);
}

function hasGraphiqHeader(statements: readonly Statement[]): boolean {
  return statements.some((statement) => /^diagram\s+\S+/.test(statement.text));
}

function statementHasMarkupSignal(statement: Statement): boolean {
  const { keyword } = keywordOf(statement.text);
  const lower = keyword.toLowerCase();
  if (lower === "@startuml" || lower === "@enduml") {
    return true;
  }
  if (isParticipantKind(lower) || lower === "activate" || lower === "deactivate") {
    return true;
  }
  if (lower === "note" || lower === "hnote" || lower === "rnote") {
    return true;
  }
  if (isGroupOperator(lower)) {
    return true;
  }
  return findArrow(statement.text) !== null;
}

export function isSequenceMarkup(text: string): boolean {
  const statements = scanStatements(text.replace(/^\uFEFF/, ""));
  if (statements.length === 0 || hasGraphiqHeader(statements)) {
    return false;
  }
  if (statements.some((statement) => isMermaidHeader(statement.text))) {
    return false;
  }
  return statements.some(statementHasMarkupSignal);
}

function currentItems(frames: Frame[]): SequenceMarkupItem[] {
  const frame = frames[frames.length - 1];
  const operand = frame?.operands[frame.operands.length - 1];
  if (operand === undefined) {
    return [];
  }
  return operand.items;
}

function parseParticipant(
  kind: SequenceMarkupParticipantKind,
  rest: string,
  span: DslSpan,
  diagnostics: Diagnostic[],
): SequenceMarkupParticipant | null {
  const colored = stripTrailingColor(rest.trim());
  if (colored.colored) {
    diagnostics.push(warning("Participant color is ignored.", span));
  }
  const first = readName(colored.text.trim());
  if (first === null) {
    diagnostics.push(warning("Participant declaration is missing a name.", span));
    return null;
  }
  let displayName = first.name;
  let alias: string | undefined;
  let after = first.rest.trim();
  const asMatch = /^as\b\s*([\s\S]*)$/i.exec(after);
  if (asMatch?.[1] !== undefined) {
    const coloredAlias = stripTrailingColor(asMatch[1].trim());
    if (coloredAlias.colored) {
      diagnostics.push(warning("Participant color is ignored.", span));
    }
    const second = readName(coloredAlias.text.trim());
    if (second === null || second.rest.trim().length > 0) {
      diagnostics.push(warning("Participant alias could not be read.", span));
      return null;
    }
    alias = second.name;
    const firstPlain = isIdentifier(displayName);
    const aliasPlain = isIdentifier(alias);
    if (firstPlain && !aliasPlain) {
      const swapped = displayName;
      displayName = alias;
      alias = swapped;
    }
  } else if (after.length > 0) {
    diagnostics.push(warning(`Ignored trailing text "${after}".`, span));
  }
  if (alias === displayName) {
    alias = undefined;
  }
  return {
    kind,
    displayName,
    ...(alias !== undefined ? { alias } : {}),
    span,
  };
}

function parseNoteStart(statement: Statement, diagnostics: Diagnostic[]): {
  note: Omit<SequenceMarkupNote, "text" | "span">;
  inlineText?: string;
  multiline: boolean;
} | null {
  const { keyword, rest } = keywordOf(statement.text);
  const lower = keyword.toLowerCase();
  if (lower === "hnote" || lower === "rnote") {
    diagnostics.push(warning("Note shape keywords are drawn as a standard note.", spanOf(statement)));
  }
  const match = /^(left|right|over)(?:\s+of)?\s*([\s\S]*)$/i.exec(rest.trim());
  if (match?.[1] === undefined) {
    diagnostics.push(warning("Note is missing a placement.", spanOf(statement)));
    return null;
  }
  const placement = match[1].toLowerCase();
  if (placement !== "left" && placement !== "right" && placement !== "over") {
    diagnostics.push(warning("Note placement is not supported.", spanOf(statement)));
    return null;
  }
  const body = match[2] ?? "";
  const labeled = splitLabel(body);
  const participants = readParticipantList(labeled.head);
  if (participants.length === 0) {
    diagnostics.push(warning("Note is missing a participant.", spanOf(statement)));
    return null;
  }
  return {
    note: { itemKind: "note", placement, participants },
    ...(labeled.label !== undefined ? { inlineText: labeled.label } : {}),
    multiline: labeled.label === undefined,
  };
}

function readParticipantList(text: string): string[] {
  const names: string[] = [];
  let rest = text.trim();
  if (rest.length === 0) {
    return [];
  }
  while (rest.length > 0) {
    const name = readName(rest);
    if (name === null) {
      return [];
    }
    names.push(name.name);
    const after = name.rest.trim();
    if (after.length === 0) {
      return names;
    }
    if (!after.startsWith(",")) {
      return [];
    }
    rest = after.slice(1).trim();
  }
  return names;
}

function parseMessage(statement: Statement): SequenceMarkupItem | null {
  const labeled = splitLabel(statement.text);
  const found = findArrow(labeled.head);
  if (found === null) {
    return null;
  }
  let leftRaw = labeled.head.slice(0, found.index).trim();
  let rightRaw = labeled.head.slice(found.index + found.arrow.length).trim();
  const activations: SequenceMarkupActivationMarker[] = [];
  if (rightRaw.startsWith("++")) {
    activations.push({ participant: "", action: "activate" });
    rightRaw = rightRaw.slice(2).trim();
  } else if (rightRaw.startsWith("--")) {
    activations.push({ participant: "", action: "deactivate" });
    rightRaw = rightRaw.slice(2).trim();
  }
  const left = readEndpoint(leftRaw);
  const right = readEndpoint(rightRaw);
  if (left === null || right === null) {
    return null;
  }
  const leftward = found.arrow.startsWith("<");
  const source = leftward ? right.name : left.name;
  const target = leftward ? left.name : right.name;
  const sourceMarker = leftward ? right.marker : left.marker;
  const targetMarker = leftward ? left.marker : right.marker;
  if (sourceMarker === "++") {
    activations.push({ participant: source, action: "activate" });
  } else if (sourceMarker === "--") {
    activations.push({ participant: source, action: "deactivate" });
  }
  if (targetMarker === "++") {
    activations.push({ participant: target, action: "activate" });
  } else if (targetMarker === "--") {
    activations.push({ participant: target, action: "deactivate" });
  }
  for (const marker of activations) {
    if (marker.participant.length === 0) {
      marker.participant = target;
    }
  }
  return {
    itemKind: "message",
    source,
    target,
    messageSort: messageSortFor(found.arrow),
    ...(labeled.label !== undefined ? { label: labeled.label } : {}),
    activations,
    span: spanOf(statement),
  };
}

function unsupportedReason(statement: Statement): string {
  const { keyword } = keywordOf(statement.text);
  const lower = keyword.toLowerCase();
  if (
    lower === "skinparam" ||
    lower === "autonumber" ||
    statement.text.startsWith("==") ||
    lower === "box" ||
    lower === "ref" ||
    lower === "delay"
  ) {
    return `Ignored unsupported sequence markup "${keyword || statement.text.slice(0, 24)}".`;
  }
  return `Ignored unsupported line "${statement.text.slice(0, 80)}".`;
}

export function parseSequenceMarkup(text: string): SequenceMarkupParseResult {
  const source = text.replace(/^\uFEFF/, "");
  const statements = scanStatements(source);
  const diagnostics: Diagnostic[] = [];
  const participants: SequenceMarkupParticipant[] = [];
  const frames: Frame[] = [
    { kind: "root", operands: [{ items: [] }], spanStart: 0 },
  ];
  let title: string | undefined;
  let stopped = false;
  let noteLines: string[] | null = null;
  let openNote: {
    note: Omit<SequenceMarkupNote, "text" | "span">;
    start: number;
  } | null = null;

  const finishNote = (end: number) => {
    if (openNote === null) {
      return;
    }
    const textBody = (noteLines ?? []).join("\n").trim();
    currentItems(frames).push({
      ...openNote.note,
      text: textBody,
      span: { start: openNote.start, end },
    });
    openNote = null;
    noteLines = null;
  };

  const closeFrame = (end: number) => {
    if (frames.length <= 1) {
      diagnostics.push(warning("end has no matching group.", { start: end, end }));
      return;
    }
    const frame = frames.pop();
    if (frame === undefined || frame.kind === "root") {
      return;
    }
    if (frame.kind === "skip") {
      for (const operand of frame.operands) {
        currentItems(frames).push(...operand.items);
      }
      return;
    }
    if (frame.operator === undefined) {
      return;
    }
    const group: SequenceMarkupGroup = {
      itemKind: "group",
      operator: frame.operator,
      operands: frame.operands.filter((operand) => operand.items.length > 0 || operand.guard !== undefined),
      span: { start: frame.spanStart, end },
    };
    if (group.operands.length === 0) {
      group.operands.push({ items: [] });
    }
    currentItems(frames).push(group);
  };

  for (const statement of statements) {
    if (stopped) {
      diagnostics.push(warning("Ignored text after @enduml.", spanOf(statement)));
      continue;
    }
    if (openNote !== null) {
      if (/^end\s*note$/i.test(statement.text) || /^end[hr]note$/i.test(statement.text)) {
        finishNote(statement.end);
        continue;
      }
      noteLines?.push(statement.text);
      continue;
    }

    const { keyword, rest } = keywordOf(statement.text);
    const lower = keyword.toLowerCase();
    if (lower === "@startuml") {
      continue;
    }
    if (lower === "@enduml") {
      stopped = true;
      continue;
    }
    if (lower === "title") {
      const nextTitle = rest.trim();
      if (title !== undefined) {
        diagnostics.push(warning("Extra title is ignored.", spanOf(statement)));
      } else if (nextTitle.length > 0) {
        title = nextTitle;
      }
      continue;
    }
    if (isParticipantKind(lower)) {
      const participant = parseParticipant(lower, rest, spanOf(statement), diagnostics);
      if (participant !== null) {
        participants.push(participant);
      }
      continue;
    }
    if (lower === "note" || lower === "hnote" || lower === "rnote") {
      const parsed = parseNoteStart(statement, diagnostics);
      if (parsed === null) {
        continue;
      }
      if (!parsed.multiline) {
        currentItems(frames).push({
          ...parsed.note,
          text: parsed.inlineText ?? "",
          span: spanOf(statement),
        });
        continue;
      }
      openNote = { note: parsed.note, start: statement.start };
      noteLines = [];
      continue;
    }
    if (lower === "activate" || lower === "deactivate") {
      const name = readName(rest.trim());
      if (name === null || name.rest.trim().length > 0) {
        diagnostics.push(warning(`${keyword} is missing a participant.`, spanOf(statement)));
        continue;
      }
      currentItems(frames).push({
        itemKind: lower,
        participant: name.name,
        span: spanOf(statement),
      });
      continue;
    }
    if (lower === "else" || lower === "and") {
      const frame = frames[frames.length - 1];
      if (frame === undefined || frame.kind === "root") {
        diagnostics.push(warning(`${keyword} is outside a group.`, spanOf(statement)));
        continue;
      }
      if (frame.operator !== undefined && frame.operator !== "alt" && frame.operator !== "par") {
        diagnostics.push(
          warning(`${keyword} is only a new branch for alt and par.`, spanOf(statement)),
        );
      }
      const guard = rest.trim();
      frame.operands.push({
        ...(guard.length > 0 ? { guard } : {}),
        items: [],
      });
      continue;
    }
    if (lower === "end") {
      closeFrame(statement.end);
      continue;
    }
    if (isGroupOperator(lower)) {
      const guard = rest.trim();
      frames.push({
        kind: "group",
        operator: lower,
        operands: [
          {
            ...(guard.length > 0 ? { guard } : {}),
            items: [],
          },
        ],
        spanStart: statement.start,
      });
      continue;
    }
    if (isSkipGroup(lower)) {
      diagnostics.push(warning(unsupportedReason(statement), spanOf(statement)));
      frames.push({
        kind: "skip",
        operands: [{ items: [] }],
        spanStart: statement.start,
      });
      continue;
    }

    const message = parseMessage(statement);
    if (message !== null) {
      currentItems(frames).push(message);
      continue;
    }
    diagnostics.push(warning(unsupportedReason(statement), spanOf(statement)));
  }

  if (openNote !== null) {
    diagnostics.push(warning("Note is missing end note.", { start: openNote.start, end: source.length }));
    finishNote(source.length);
  }
  while (frames.length > 1) {
    diagnostics.push(warning("Group is missing end.", { start: frames[frames.length - 1]?.spanStart ?? 0, end: source.length }));
    closeFrame(source.length);
  }

  const root = frames[0]?.operands[0]?.items ?? [];
  return {
    document: {
      ...(title !== undefined ? { title } : {}),
      participants,
      items: root,
      span: { start: 0, end: source.length },
    },
    diagnostics,
  };
}
