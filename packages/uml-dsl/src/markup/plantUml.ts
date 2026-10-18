import { createId, type DiagramKind, type Diagnostic } from "@graphiq/uml-core";
import { formatDiagramHeader } from "../diagramTitle.js";
import { isSequenceMarkup } from "../sequenceMarkup/parseSequenceMarkup.js";

export const PLANTUML_MARKUP_RULE_ID = "plantuml.markup";

export type PlantUmlTranslation = {
  kind: DiagramKind;
  dsl: string;
  diagnostics: Diagnostic[];
};

type MarkupNode =
  | { type: "line"; text: string }
  | { type: "block"; header: string; children: MarkupNode[] };

const MERMAID_HEADER =
  /^(?:classDiagram|sequenceDiagram|flowchart|graph|erDiagram|stateDiagram(?:-v2)?|gitGraph|pie|journey|gantt|mindmap|timeline|quadrantChart|requirementDiagram|C4Context|C4Container|C4Component)\b/;

function warning(message: string): Diagnostic {
  return {
    id: createId(),
    ruleId: PLANTUML_MARKUP_RULE_ID,
    severity: "warning",
    message,
    elementIds: [],
  };
}

function scanLines(source: string): string[] {
  const lines: string[] = [];
  let index = 0;
  let buffer = "";
  let inBlock = false;
  const push = () => {
    const text = buffer.trim();
    if (text.length > 0) {
      lines.push(text);
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
        push();
      }
      index += 1;
      continue;
    }
    if (source[index] === "\r") {
      index += 1;
      continue;
    }
    if (source[index] === "'" && !openQuote(buffer)) {
      while (index < source.length && source[index] !== "\n") {
        index += 1;
      }
      continue;
    }
    if (source[index] === "\n") {
      push();
      index += 1;
      continue;
    }
    buffer += source[index];
    index += 1;
  }
  push();
  return lines;
}

function openQuote(buffer: string): boolean {
  let open = false;
  for (const character of buffer) {
    if (character === '"') {
      open = !open;
    }
  }
  return open;
}

function parseLevel(lines: readonly string[], cursor: { index: number }): MarkupNode[] {
  const nodes: MarkupNode[] = [];
  while (cursor.index < lines.length) {
    const line = lines[cursor.index] ?? "";
    if (line === "}" || line.startsWith("}")) {
      cursor.index += 1;
      return nodes;
    }
    const open = line.indexOf("{");
    if (open >= 0) {
      const header = line.slice(0, open).trim();
      const rest = line.slice(open + 1).trim();
      cursor.index += 1;
      if (rest.endsWith("}")) {
        const inner = rest.slice(0, -1).trim();
        nodes.push({
          type: "block",
          header,
          children: inner.length > 0 ? [{ type: "line", text: inner }] : [],
        });
        continue;
      }
      nodes.push({ type: "block", header, children: parseLevel(lines, cursor) });
      continue;
    }
    nodes.push({ type: "line", text: line });
    cursor.index += 1;
  }
  return nodes;
}

function lineText(nodes: readonly MarkupNode[]): string[] {
  const lines: string[] = [];
  for (const node of nodes) {
    if (node.type === "line") {
      lines.push(node.text);
      continue;
    }
    lines.push(node.header);
    lines.push(...lineText(node.children));
  }
  return lines;
}

function hasLine(lines: readonly string[], pattern: RegExp): boolean {
  return lines.some((line) => pattern.test(line));
}

function hasArrow(lines: readonly string[]): boolean {
  return lines.some((line) => /<?-{1,2}>{1,2}|<{1,2}-{1,2}>?/.test(line));
}

export function detectMarkupKind(text: string): DiagramKind | null {
  const lines = scanLines(text.replace(/^\uFEFF/, ""));
  if (lines.length === 0 || hasLine(lines, /^diagram\s+\S+/) || hasLine(lines, MERMAID_HEADER)) {
    return null;
  }
  if (hasLine(lines, /^(?:stereotype|extension)\b/i)) {
    return "profile";
  }
  if (hasLine(lines, /^(?:part|connector|port)\b/i)) {
    return "compositeStructure";
  }
  if (hasLine(lines, /^robust\b/i) || hasLine(lines, /^concise\b/i) || (hasLine(lines, /^lifeline\b/i) && hasLine(lines, /@/))) {
    return "timing";
  }
  if (hasLine(lines, /\bref\b/i) && hasLine(lines, /-->/)) {
    return "interactionOverview";
  }
  if (hasLine(lines, /^(?:usecase|subject)\b/i) || hasLine(lines, /^\([^)\n]+\)$/) || hasLine(lines, /^:[^:\n]+:/)) {
    return "useCase";
  }
  if (hasLine(lines, /^\[\*\]/) || hasLine(lines, /^state\b/i) || hasLine(lines, /^history\b/i)) {
    return "stateMachine";
  }
  if (
    hasLine(lines, /^(?:partition|action|decision|fork|join|merge|initial|final|flowFinal)\b/i) ||
    hasLine(lines, /^start$/i) ||
    hasLine(lines, /^stop$/i) ||
    hasLine(lines, /^:[^;]+;/) ||
    hasLine(lines, /^\(\*\)$/) ||
    hasLine(lines, /^\(\*\)\s*-->/)
  ) {
    return "activity";
  }
  if (hasLine(lines, /^component\b/i) || hasLine(lines, /^\[[^\]]+\]$/)) {
    return "component";
  }
  if (hasLine(lines, /^(?:node|artifact|cloud)\b/i)) {
    return "deployment";
  }
  if (hasLine(lines, /^database\b/i) && !hasLine(lines, /^(?:participant|actor)\b/i) && !hasArrow(lines)) {
    return "deployment";
  }
  if (hasLine(lines, /^package\b/i)) {
    return "package";
  }
  if (hasLine(lines, /^(?:class|interface|abstract|enum)\b/i) || hasLine(lines, /<\|--/) || hasLine(lines, /\*--/) || hasLine(lines, /\bo--/)) {
    return "class";
  }
  if (hasLine(lines, /^object\b/i)) {
    return "object";
  }
  if (hasLine(lines, /^instance\b/i) && hasLine(lines, /:\s*\d+:/)) {
    return "communication";
  }
  if (hasLine(lines, /^instance\b/i)) {
    return "object";
  }
  if (isSequenceMarkup(text)) {
    return "sequence";
  }
  return null;
}

function ident(name: string): string {
  const trimmed = name.trim().replace(/^"|"$/g, "");
  if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(trimmed)) {
    return trimmed;
  }
  const cleaned = trimmed.replace(/[^A-Za-z0-9_]/g, "");
  if (/^[A-Za-z_]/.test(cleaned) && cleaned.length > 0) {
    return cleaned;
  }
  return `N${cleaned || "1"}`;
}

function readQuotedOrWord(input: string): { name: string; rest: string } | null {
  const trimmed = input.trimStart();
  if (trimmed.startsWith('"')) {
    const end = trimmed.indexOf('"', 1);
    if (end < 0) {
      return null;
    }
    return { name: trimmed.slice(1, end), rest: trimmed.slice(end + 1) };
  }
  const match = /^[A-Za-z_][A-Za-z0-9_.]*/.exec(trimmed);
  if (match?.[0] === undefined) {
    return null;
  }
  return { name: match[0], rest: trimmed.slice(match[0].length) };
}

function aliasName(first: string, rest: string): string {
  const asMatch = /^\s+as\s+([\s\S]+)$/i.exec(rest);
  if (asMatch?.[1] === undefined) {
    return ident(first);
  }
  const second = readQuotedOrWord(asMatch[1].trim());
  if (second === null) {
    return ident(first);
  }
  const firstPlain = /^[A-Za-z_][A-Za-z0-9_]*$/.test(first);
  const secondPlain = /^[A-Za-z_][A-Za-z0-9_]*$/.test(second.name);
  if (firstPlain && !secondPlain) {
    return ident(first);
  }
  if (!firstPlain && secondPlain) {
    return second.name;
  }
  return secondPlain ? second.name : ident(first);
}

function header(kind: DiagramKind, title?: string): string {
  return formatDiagramHeader(kind, title);
}

function prepare(text: string, diagnostics: Diagnostic[]): { title?: string; nodes: MarkupNode[] } {
  const raw = scanLines(text.replace(/^\uFEFF/, ""));
  const kept: string[] = [];
  let title: string | undefined;
  for (const line of raw) {
    if (/^@startuml\b/i.test(line)) {
      const rest = line.replace(/^@startuml\b/i, "").trim();
      if (rest.length > 0 && title === undefined) {
        title = rest.replace(/^"|"$/g, "");
      }
      continue;
    }
    if (/^@enduml\b/i.test(line)) {
      continue;
    }
    if (/^title\b/i.test(line)) {
      const next = line.replace(/^title\b/i, "").trim();
      if (next.length > 0 && title === undefined) {
        title = next;
      }
      continue;
    }
    if (/^(?:skinparam|hide|show|sprite|scale|left to right direction|top to bottom direction)\b/i.test(line)) {
      diagnostics.push(warning(`Ignored unsupported line "${line.slice(0, 80)}".`));
      continue;
    }
    kept.push(line);
  }
  return { ...(title !== undefined ? { title } : {}), nodes: parseLevel(kept, { index: 0 }) };
}

function findArrow(line: string, arrows: readonly string[]): { index: number; arrow: string } | null {
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    if (line[index] === '"') {
      quoted = !quoted;
      continue;
    }
    if (quoted) {
      continue;
    }
    for (const arrow of arrows) {
      if (line.startsWith(arrow, index)) {
        return { index, arrow };
      }
    }
  }
  return null;
}

const CLASS_ARROWS = ["<|--", "<|..", "*-->", "o-->", "*--", "o--", "--*", "--o", "-->", "<--", "..|>", "--|>", "..>", "<..", "--", ".."];

function classRelation(line: string): string | null {
  const labeled = line.split(":");
  const head = labeled[0]?.trim() ?? "";
  const label = labeled.slice(1).join(":").trim();
  const found = findArrow(head, CLASS_ARROWS);
  if (found === null) {
    return null;
  }
  const left = head.slice(0, found.index).trim().replace(/^"|"$/g, "").replace(/\s+"[^"]+"\s*$/, "").trim();
  const right = head.slice(found.index + found.arrow.length).trim().replace(/^"[^"]+"\s*/, "").replace(/^"|"$/g, "").trim();
  const leftName = ident(left.split(/\s+/).pop() ?? left);
  const rightName = ident(right.split(/\s+/)[0] ?? right);
  const suffix = label.length > 0 ? ` : ${label}` : "";
  switch (found.arrow) {
    case "<|--":
      return `${rightName} --|> ${leftName}${suffix}`;
    case "<|..":
      return `${rightName} ..|> ${leftName}${suffix}`;
    case "--|>":
      return `${leftName} --|> ${rightName}${suffix}`;
    case "..|>":
      return `${leftName} ..|> ${rightName}${suffix}`;
    case "*--":
    case "*-->":
      return `${leftName} *-- ${rightName}${suffix}`;
    case "--*":
      return `${rightName} *-- ${leftName}${suffix}`;
    case "o--":
    case "o-->":
      return `${leftName} o-- ${rightName}${suffix}`;
    case "--o":
      return `${rightName} o-- ${leftName}${suffix}`;
    case "-->":
    case "..>":
      return `${leftName} ..> ${rightName}${suffix}`;
    case "<--":
    case "<..":
      return `${rightName} ..> ${leftName}${suffix}`;
    case "--":
      return `${leftName} -- ${rightName}${suffix}`;
    case "..":
      return `${leftName} ..> ${rightName}${suffix}`;
    default:
      return null;
  }
}

function emitClassifier(node: MarkupNode, lines: string[], indent = ""): void {
  if (node.type === "line") {
    return;
  }
  const headerMatch = /^(abstract\s+class|class|interface|enum)\s+([\s\S]+)$/i.exec(node.header.trim());
  if (headerMatch?.[1] === undefined || headerMatch[2] === undefined) {
    return;
  }
  const keyword = headerMatch[1].toLowerCase().replace(/\s+/g, " ");
  const name = aliasName(readQuotedOrWord(headerMatch[2])?.name ?? headerMatch[2], headerMatch[2].replace(/^(\S+|"[^"]+")/, ""));
  const members = node.children.flatMap((child) => (child.type === "line" ? [child.text] : []));
  if (keyword === "enum") {
    lines.push(`${indent}enum ${name} {`);
    for (const member of members) {
      lines.push(`${indent}  ${ident(member)}`);
    }
    lines.push(`${indent}}`);
    return;
  }
  const dslKeyword = keyword === "abstract class" ? "abstract class" : keyword;
  if (members.length === 0) {
    lines.push(`${indent}${dslKeyword} ${name}`);
    return;
  }
  lines.push(`${indent}${dslKeyword} ${name} {`);
  for (const member of members) {
    if (/^[+\-#~]/.test(member) || member.includes(":") || member.includes("(")) {
      lines.push(`${indent}  ${member.trim()}`);
    }
  }
  lines.push(`${indent}}`);
}

function translateClass(nodes: readonly MarkupNode[], title: string | undefined, diagnostics: Diagnostic[]): string {
  const lines = [header("class", title), ""];
  for (const node of nodes) {
    if (node.type === "block") {
      emitClassifier(node, lines);
      lines.push("");
      continue;
    }
    const relation = classRelation(node.text);
    if (relation !== null) {
      lines.push(relation);
      continue;
    }
    if (/^(?:class|interface|abstract|enum)\b/i.test(node.text)) {
      lines.push(node.text.replace(/^abstract\s+/i, "abstract "));
      continue;
    }
    diagnostics.push(warning(`Ignored unsupported line "${node.text.slice(0, 80)}".`));
  }
  return `${lines.join("\n").trim()}\n`;
}

function translatePackage(nodes: readonly MarkupNode[], title: string | undefined, diagnostics: Diagnostic[]): string {
  const lines = [header("package", title), ""];
  for (const node of nodes) {
    if (node.type === "block" && /^package\b/i.test(node.header)) {
      const name = aliasName(readQuotedOrWord(node.header.replace(/^package\b/i, "").trim())?.name ?? "Package", "");
      lines.push(`package ${ident(name)} {`);
      for (const child of node.children) {
        if (child.type === "block") {
          emitClassifier(child, lines, "  ");
        }
      }
      lines.push("}");
      lines.push("");
      continue;
    }
    if (node.type === "line") {
      if (/\.\.>/.test(node.text)) {
        lines.push(node.text);
        continue;
      }
      const relation = classRelation(node.text);
      if (relation !== null && relation.includes("..>")) {
        lines.push(relation);
        continue;
      }
    }
    diagnostics.push(warning(`Ignored unsupported line "${node.type === "line" ? node.text : node.header}".`));
  }
  return `${lines.join("\n").trim()}\n`;
}

function translateUseCase(nodes: readonly MarkupNode[], title: string | undefined, diagnostics: Diagnostic[]): string {
  const lines = [header("useCase", title), ""];
  const emitUseCaseBlock = (children: readonly MarkupNode[], indent: string) => {
    for (const child of children) {
      if (child.type === "line") {
        const useCase = useCaseName(child.text);
        if (useCase !== null) {
          lines.push(`${indent}usecase ${useCase}`);
        }
      }
    }
  };
  for (const node of nodes) {
    if (node.type === "block" && /^(?:rectangle|package|subject)\b/i.test(node.header)) {
      const name = ident(node.header.replace(/^(?:rectangle|package|subject)\b/i, "").trim().replace(/^"|"$/g, ""));
      lines.push(`subject ${name} {`);
      emitUseCaseBlock(node.children, "  ");
      lines.push("}");
      lines.push("");
      continue;
    }
    if (node.type !== "line") {
      continue;
    }
    if (/^actor\b/i.test(node.text) || /^:[^:]+:/.test(node.text)) {
      const raw = node.text.replace(/^actor\b/i, "").trim().replace(/^:|:$/g, "");
      lines.push(`actor ${ident(aliasName(readQuotedOrWord(raw)?.name ?? raw, raw))}`);
      continue;
    }
    const lone = useCaseName(node.text);
    if (lone !== null && !node.text.includes("--") && !node.text.includes("..")) {
      lines.push(`usecase ${lone}`);
      continue;
    }
    const relation = useCaseRelation(node.text);
    if (relation !== null) {
      lines.push(relation);
      continue;
    }
    diagnostics.push(warning(`Ignored unsupported line "${node.text.slice(0, 80)}".`));
  }
  return `${lines.join("\n").trim()}\n`;
}

function useCaseName(text: string): string | null {
  const paren = /^\(([^)]+)\)$/.exec(text.trim());
  if (paren?.[1] !== undefined) {
    return ident(paren[1]);
  }
  const keyword = /^usecase\s+(.+)$/i.exec(text.trim());
  if (keyword?.[1] !== undefined) {
    return ident(keyword[1].replace(/^\(|\)$/g, ""));
  }
  return null;
}

function useCaseRelation(line: string): string | null {
  const found = findArrow(line, ["<|--", "--|>", "..>", "<..", "--"]);
  if (found === null) {
    return null;
  }
  const left = line.slice(0, found.index).trim();
  const rightAndLabel = line.slice(found.index + found.arrow.length).trim();
  const pieces = rightAndLabel.split(":");
  const right = pieces[0]?.trim() ?? "";
  const label = pieces.slice(1).join(":").trim().toLowerCase();
  const leftName = ident(left.replace(/^\(|\)$/g, "").replace(/^actor\s+/i, ""));
  const rightName = ident(right.replace(/^\(|\)$/g, ""));
  if (found.arrow === "<|--") {
    return `${rightName} --|> ${leftName}`;
  }
  if (found.arrow === "--|>") {
    return `${leftName} --|> ${rightName}`;
  }
  if (found.arrow === "--") {
    return `${leftName} -- ${rightName}`;
  }
  const keyword = label.includes("extend") ? "«extend»" : label.includes("include") ? "«include»" : "";
  const suffix = keyword.length > 0 ? ` : ${keyword}` : "";
  if (found.arrow === "<..") {
    return `${rightName} ..> ${leftName}${suffix}`;
  }
  return `${leftName} ..> ${rightName}${suffix}`;
}

function translateComponent(nodes: readonly MarkupNode[], title: string | undefined, diagnostics: Diagnostic[]): string {
  const components = new Set<string>();
  const lines: string[] = [];
  const relations: string[] = [];
  for (const node of nodes) {
    if (node.type === "block" && /^component\b/i.test(node.header)) {
      const name = ident(node.header.replace(/^component\b/i, "").trim());
      components.add(name);
      lines.push(`component ${name} {`);
      for (const child of node.children) {
        if (child.type === "line" && /^(?:provides|requires|port|artifact)\b/i.test(child.text)) {
          lines.push(`  ${child.text}`);
        }
      }
      lines.push("}");
      continue;
    }
    if (node.type !== "line") {
      continue;
    }
    if (/^component\b/i.test(node.text) || /^\[[^\]]+\]$/.test(node.text)) {
      const name = ident(node.text.replace(/^component\b/i, "").replace(/^\[|\]$/g, "").trim());
      components.add(name);
      lines.push(`component ${name}`);
      continue;
    }
    if (/^interface\b/i.test(node.text)) {
      const name = ident(node.text.replace(/^interface\b/i, "").trim());
      components.add(name);
      lines.push(`component ${name}`);
      continue;
    }
    if (node.text.includes("required") && node.text.includes("provided")) {
      relations.push(node.text);
      continue;
    }
    const found = findArrow(node.text, ["-->", "..>", "--"]);
    if (found !== null) {
      const left = ident(node.text.slice(0, found.index).trim());
      const right = ident(node.text.slice(found.index + found.arrow.length).split(":")[0]?.trim() ?? "");
      components.add(left);
      components.add(right);
      if (found.arrow === "--") {
        relations.push(`${left} required ${left}${right} -- provided ${left}${right} ${right}`);
        lines.push(`component ${left} {\n  requires ${left}${right}\n}`);
        lines.push(`component ${right} {\n  provides ${left}${right}\n}`);
      } else {
        relations.push(`${left} ..> ${right}`);
      }
      continue;
    }
    diagnostics.push(warning(`Ignored unsupported line "${node.text.slice(0, 80)}".`));
  }
  return `${[header("component", title), "", ...lines, ...relations].join("\n").trim()}\n`;
}

function translateDeployment(nodes: readonly MarkupNode[], title: string | undefined, diagnostics: Diagnostic[]): string {
  const lines = [header("deployment", title), ""];
  for (const node of nodes) {
    if (node.type === "block") {
      const kind = node.header.split(/\s+/)[0]?.toLowerCase();
      const name = node.header.replace(/^(?:node|database|cloud|artifact)\b/i, "").trim();
      const printed = deploymentName(kind ?? "node", name);
      const artifacts = node.children.flatMap((child) =>
        child.type === "line" && /^artifact\b/i.test(child.text) ? [`  ${child.text}`] : [],
      );
      if (artifacts.length === 0) {
        lines.push(printed);
      } else {
        lines.push(`${printed} {`, ...artifacts, "}");
      }
      continue;
    }
    if (/^(?:node|database|cloud)\b/i.test(node.text)) {
      const kind = node.text.split(/\s+/)[0]?.toLowerCase() ?? "node";
      lines.push(deploymentName(kind, node.text.replace(/^(?:node|database|cloud)\b/i, "").trim()));
      continue;
    }
    if (/^artifact\b/i.test(node.text)) {
      lines.push(node.text);
      continue;
    }
    if (node.text.includes("--")) {
      lines.push(node.text);
      continue;
    }
    diagnostics.push(warning(`Ignored unsupported line "${node.text.slice(0, 80)}".`));
  }
  return `${lines.join("\n").trim()}\n`;
}

function deploymentName(kind: string, raw: string): string {
  const name = raw.replace(/^"|"$/g, "").trim();
  const printed = /\s/.test(name) ? `"${name}"` : name;
  if (kind === "database") {
    return `node ${printed} <<device>>`;
  }
  if (kind === "cloud") {
    return `node ${printed} <<executionEnvironment>>`;
  }
  if (/<<.+>>/.test(raw)) {
    return `node ${raw}`;
  }
  return `node ${printed}`;
}

function translateObject(nodes: readonly MarkupNode[], title: string | undefined, diagnostics: Diagnostic[]): string {
  const lines = [header("object", title), ""];
  for (const node of nodes) {
    if (node.type === "block") {
      const name = objectDeclaration(node.header);
      lines.push(`${name} {`);
      for (const child of node.children) {
        if (child.type === "line") {
          lines.push(`  ${objectSlot(child.text)}`);
        }
      }
      lines.push("}");
      continue;
    }
    if (/^(?:object|instance)\b/i.test(node.text)) {
      lines.push(objectDeclaration(node.text));
      continue;
    }
    if (node.text.includes("--") || node.text.includes("..>")) {
      lines.push(node.text.replace(/\bobject\b/gi, "").trim());
      continue;
    }
    diagnostics.push(warning(`Ignored unsupported line "${node.text.slice(0, 80)}".`));
  }
  return `${lines.join("\n").trim()}\n`;
}

function objectDeclaration(headerText: string): string {
  if (/^instance\b/i.test(headerText)) {
    return headerText;
  }
  const rest = headerText.replace(/^object\b/i, "").trim();
  const first = readQuotedOrWord(rest);
  if (first === null) {
    return "instance Object1: Object";
  }
  const named = aliasName(first.name, first.rest);
  const typeMatch = /:\s*([A-Za-z_][A-Za-z0-9_]*)/.exec(first.rest);
  const typeName = typeMatch?.[1] ?? "Object";
  return `instance ${named}: ${typeName}`;
}

function objectSlot(line: string): string {
  if (line.includes("=")) {
    return line;
  }
  const parts = line.split(":");
  if (parts.length >= 2) {
    return `${parts[0]?.trim()} = ${parts.slice(1).join(":").trim()}`;
  }
  return line;
}

function isGraphiqActivityLine(line: string): boolean {
  if (/^(?:partition|action|decision|merge|join|initial|final|flowFinal)\b/i.test(line)) {
    return true;
  }
  return /^fork\s+(?!again\b)[A-Za-z_]/.test(line) || /-->/.test(line);
}

function translateActivity(nodes: readonly MarkupNode[], title: string | undefined): string {
  const flat = lineText(nodes);
  if (flat.some((line) => isGraphiqActivityLine(line))) {
    return `${header("activity", title)}\n\n${renderBlocks(nodes).join("\n")}\n`;
  }
  const declarations: string[] = [];
  const flows: string[] = [];
  const partitions = new Map<string, string[]>();
  let partition: string | undefined;
  let previous = "initial";
  let sawInitial = false;
  let guard: string | undefined;
  let counter = 0;
  const branches: { decision: string; yesEnd?: string }[] = [];
  const forks: { fork: string; ends: string[] }[] = [];
  const nextName = (prefix: string) => {
    counter += 1;
    return `${prefix}${counter}`;
  };
  const addAction = (name: string) => {
    if (partition !== undefined) {
      const list = partitions.get(partition) ?? [];
      list.push(name);
      partitions.set(partition, list);
    } else {
      declarations.push(`action ${name}`);
    }
  };
  const connect = (source: string, target: string, guard?: string) => {
    flows.push(guard !== undefined && guard.length > 0 ? `${source} --> ${target} : [${guard}]` : `${source} --> ${target}`);
  };
  for (const line of flat) {
    const lane = /^\|([^|]+)\|$/.exec(line);
    if (lane?.[1] !== undefined) {
      partition = ident(lane[1]);
      continue;
    }
    if (line === "start" || line === "(*)") {
      sawInitial = true;
      previous = "initial";
      continue;
    }
    if (line === "stop") {
      connect(previous, "final");
      previous = "final";
      continue;
    }
    const action = /^:([^;]+);$/.exec(line);
    if (action?.[1] !== undefined) {
      const name = ident(action[1]);
      addAction(name);
      if (!sawInitial) {
        sawInitial = true;
      }
      connect(previous, name, guard);
      guard = undefined;
      previous = name;
      continue;
    }
    const legacy = /^\(\*\)\s*-->\s*"?([^"]+)"?$/.exec(line) ?? /^"([^"]+)"\s*-->\s*(?:\(\*\)|"?([^"]+)"?)$/.exec(line);
    if (legacy !== null) {
      continue;
    }
    const quotedEdge = /^(?:\(\*\)|"([^"]+)"|([A-Za-z_][A-Za-z0-9_]*))\s*-->\s*(?:\(\*\)|"([^"]+)"|([A-Za-z_][A-Za-z0-9_]*))$/.exec(line);
    if (quotedEdge !== null) {
      const source = line.startsWith("(*)") ? "initial" : ident(quotedEdge[1] ?? quotedEdge[2] ?? "initial");
      const target = line.endsWith("(*)") ? "final" : ident(quotedEdge[3] ?? quotedEdge[4] ?? "final");
      if (source !== "initial" && source !== "final") {
        addAction(source);
      }
      if (target !== "initial" && target !== "final") {
        addAction(target);
      }
      connect(source, target);
      previous = target;
      continue;
    }
    if (/^if\b/i.test(line)) {
      const decision = nextName("decision");
      declarations.push(`decision ${decision}`);
      connect(previous, decision);
      const yes = /then\s*\(([^)]+)\)/i.exec(line)?.[1];
      branches.push({ decision });
      guard = yes !== undefined ? ident(yes) : "yes";
      previous = decision;
      continue;
    }
    if (/^else\b/i.test(line)) {
      const branch = branches[branches.length - 1];
      if (branch !== undefined) {
        branch.yesEnd = previous;
        const no = /\(([^)]+)\)/.exec(line)?.[1];
        guard = no !== undefined ? ident(no) : "no";
        previous = branch.decision;
      }
      continue;
    }
    if (/^endif\b/i.test(line)) {
      const branch = branches.pop();
      const merge = nextName("merge");
      declarations.push(`merge ${merge}`);
      connect(previous, merge);
      if (branch?.yesEnd !== undefined && branch.yesEnd !== previous && branch.yesEnd !== branch.decision) {
        connect(branch.yesEnd, merge);
      }
      previous = merge;
      guard = undefined;
      continue;
    }
    if (/^fork again\b/i.test(line)) {
      const fork = forks[forks.length - 1];
      if (fork !== undefined) {
        fork.ends.push(previous);
        previous = fork.fork;
      }
      continue;
    }
    if (/^end fork\b/i.test(line)) {
      const fork = forks.pop();
      if (fork !== undefined) {
        fork.ends.push(previous);
        const join = nextName("join");
        declarations.push(`join ${join}`);
        for (const end of fork.ends) {
          if (end !== fork.fork) {
            connect(end, join);
          }
        }
        previous = join;
      }
      continue;
    }
    if (/^fork\b/i.test(line)) {
      const fork = nextName("fork");
      declarations.push(`fork ${fork}`);
      connect(previous, fork);
      forks.push({ fork, ends: [] });
      previous = fork;
      continue;
    }
  }
  const partitionLines: string[] = [];
  for (const [name, actions] of partitions) {
    partitionLines.push(`partition ${name} {`);
    for (const actionName of actions) {
      partitionLines.push(`  action ${actionName}`);
    }
    partitionLines.push("}");
  }
  return `${[header("activity", title), "", ...partitionLines, ...declarations, ...flows].join("\n").trim()}\n`;
}

function translateState(nodes: readonly MarkupNode[], title: string | undefined): string {
  const original = lineText(nodes);
  const declarations: string[] = [];
  if (original.some((line) => line.includes("[H*]"))) {
    declarations.push("deepHistory Hd");
  }
  if (original.some((line) => /\[H\](?!\*)/.test(line))) {
    declarations.push("history H");
  }
  const body = [...declarations, ...renderStateNodes(nodes)].join("\n");
  return `${header("stateMachine", title)}\n\n${body}\n`;
}

function renderStateNodes(nodes: readonly MarkupNode[], indent = ""): string[] {
  const lines: string[] = [];
  for (const node of nodes) {
    if (node.type === "block" && /^state\b/i.test(node.header)) {
      const name = ident(node.header.replace(/^state\b/i, "").trim());
      lines.push(`${indent}state ${name} {`);
      lines.push(...renderStateNodes(node.children, `${indent}  `));
      lines.push(`${indent}}`);
      continue;
    }
    if (node.type === "line") {
      lines.push(`${indent}${node.text.replace(/\[H\*\]/g, "Hd").replace(/\[H\]/g, "H")}`);
    }
  }
  return lines;
}

function translateTiming(nodes: readonly MarkupNode[], title: string | undefined, diagnostics: Diagnostic[]): string {
  const flat = lineText(nodes);
  if (flat.some((line) => /^lifeline\b/i.test(line))) {
    return `${header("timing", title)}\n\n${renderBlocks(nodes).join("\n")}\n`;
  }
  const lifelines: { name: string; typeName: string }[] = [];
  const states = new Map<string, { name: string; at: number }[]>();
  const messages: string[] = [];
  let time = 0;
  for (const line of flat) {
    const robust = /^robust\s+(.+)$/i.exec(line);
    if (robust?.[1] !== undefined) {
      const first = readQuotedOrWord(robust[1].trim());
      if (first !== null) {
        const name = aliasName(first.name, first.rest);
        lifelines.push({ name, typeName: ident(first.name) });
        states.set(name, []);
      }
      continue;
    }
    const at = /^@(\d+)$/.exec(line);
    if (at?.[1] !== undefined) {
      time = Number(at[1]);
      continue;
    }
    const state = /^([A-Za-z_][A-Za-z0-9_]*)\s+is\s+(.+)$/i.exec(line);
    if (state?.[1] !== undefined && state[2] !== undefined) {
      const list = states.get(state[1]) ?? [];
      list.push({ name: ident(state[2]), at: time });
      states.set(state[1], list);
      continue;
    }
    if (line.includes("->")) {
      messages.push(line.includes("@") ? line : `${line.replace(":", ` @ ${time} :`)}`);
      continue;
    }
    diagnostics.push(warning(`Ignored unsupported line "${line.slice(0, 80)}".`));
  }
  const lines = [header("timing", title), ""];
  for (const lifeline of lifelines) {
    lines.push(`lifeline ${lifeline.name}: ${lifeline.typeName}`);
    const rows = states.get(lifeline.name) ?? [];
    if (rows.length > 0) {
      lines.push(`${lifeline.name} {`);
      for (const row of rows) {
        lines.push(`  ${row.name} @ ${row.at}`);
      }
      lines.push("}");
    }
  }
  lines.push(...messages);
  return `${lines.join("\n").trim()}\n`;
}

function passthrough(kind: DiagramKind, nodes: readonly MarkupNode[], title: string | undefined): string {
  return `${header(kind, title)}\n\n${renderBlocks(nodes).join("\n").trim()}\n`;
}

function renderBlocks(nodes: readonly MarkupNode[], indent = ""): string[] {
  const lines: string[] = [];
  for (const node of nodes) {
    if (node.type === "line") {
      lines.push(`${indent}${node.text}`);
      continue;
    }
    lines.push(`${indent}${node.header} {`);
    lines.push(...renderBlocks(node.children, `${indent}  `));
    lines.push(`${indent}}`);
  }
  return lines;
}

export function translatePlantUml(text: string): PlantUmlTranslation | null {
  const kind = detectMarkupKind(text);
  if (kind === null || kind === "sequence") {
    return null;
  }
  const diagnostics: Diagnostic[] = [];
  const prepared = prepare(text, diagnostics);
  const dsl = (() => {
    switch (kind) {
      case "class":
        return translateClass(prepared.nodes, prepared.title, diagnostics);
      case "package":
        return translatePackage(prepared.nodes, prepared.title, diagnostics);
      case "useCase":
        return translateUseCase(prepared.nodes, prepared.title, diagnostics);
      case "component":
        return translateComponent(prepared.nodes, prepared.title, diagnostics);
      case "deployment":
        return translateDeployment(prepared.nodes, prepared.title, diagnostics);
      case "object":
        return translateObject(prepared.nodes, prepared.title, diagnostics);
      case "activity":
        return translateActivity(prepared.nodes, prepared.title);
      case "stateMachine":
        return translateState(prepared.nodes, prepared.title);
      case "timing":
        return translateTiming(prepared.nodes, prepared.title, diagnostics);
      case "communication":
      case "compositeStructure":
      case "profile":
      case "interactionOverview":
        return passthrough(kind, prepared.nodes, prepared.title);
      default: {
        const unreachable: never = kind;
        return unreachable;
      }
    }
  })();
  return { kind, dsl, diagnostics };
}
