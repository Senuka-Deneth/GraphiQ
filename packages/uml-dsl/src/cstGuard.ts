import type { CstNode } from "chevrotain";

export function guardVisit<T>(visit: () => T): T | undefined {
  try {
    return visit();
  } catch (error) {
    if (error instanceof TypeError) {
      return undefined;
    }
    throw error;
  }
}

export function guardNodes<T>(
  nodes: readonly unknown[] | undefined,
  visit: (node: CstNode) => T,
): T[] {
  const values: T[] = [];
  for (const node of nodes ?? []) {
    if (node == null || typeof node !== "object" || !("children" in node)) {
      continue;
    }
    const value = guardVisit(() => visit(node as CstNode));
    if (value !== undefined) {
      values.push(value);
    }
  }
  return values;
}
