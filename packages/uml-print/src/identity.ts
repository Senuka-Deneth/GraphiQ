import { createId, type Diagnostic, type DslSpan } from "@graphiq/uml-core";
import type { UmlElement, UmlModel, UmlRelationship } from "@graphiq/uml-model";

export const DUPLICATE_DECLARATION_RULE_ID = "dsl.duplicate-declaration";
export const UNRESOLVED_REFERENCE_RULE_ID = "dsl.unresolved-reference";
export const AMBIGUOUS_REFERENCE_RULE_ID = "dsl.ambiguous-reference";
export const UNSUPPORTED_FEATURE_RULE_ID = "dsl.unsupported-feature";

const ANONYMOUS_ELEMENT_TYPES = new Set<UmlElement["elementType"]>([
  "combinedFragment",
  "executionSpecification",
]);

export type SourceMapEntry = {
  id?: string;
  kind: "element" | "relationship" | "reference";
  name?: string;
  span?: DslSpan;
};

export type CompilationSourceMap = {
  entries: SourceMapEntry[];
};

type PreviousElement = {
  id: string;
  element: UmlElement;
};

type PreviousRelationship = {
  id: string;
  relationship: UmlRelationship;
};

export type ElementClaim = {
  id: string;
  duplicate: boolean;
  previous?: UmlElement;
};

export type RelationshipClaim = {
  id: string;
  previous?: UmlRelationship;
};

export class IdentityTable {
  readonly diagnostics: Diagnostic[] = [];
  readonly sourceMap: CompilationSourceMap = { entries: [] };

  private readonly previousElements = new Map<string, PreviousElement>();
  private readonly previousRelationships = new Map<string, PreviousRelationship>();
  private readonly pathByNewId = new Map<string, string>();
  private readonly usedIds = new Set<string>();
  private readonly namedClaims = new Map<string, number>();
  private readonly anonCounts = new Map<string, number>();
  private readonly relationshipCounts = new Map<string, number>();

  constructor(previous?: UmlModel) {
    if (previous !== undefined) {
      this.indexElements(previous);
      this.indexRelationships(previous);
    }
  }

  allocateElement(input: {
    elementType: UmlElement["elementType"];
    name: string;
    parentId?: string;
    anonymous?: boolean;
    span?: DslSpan;
  }): ElementClaim {
    const anonymous = input.anonymous === true || ANONYMOUS_ELEMENT_TYPES.has(input.elementType);
    const parentPath = input.parentId !== undefined ? this.pathByNewId.get(input.parentId) ?? "" : "";
    const key = anonymous
      ? this.nextAnonymousKey(parentPath, input.elementType)
      : `${parentPath}/${input.elementType}:${input.name}`;
    const seen = this.namedClaims.get(key) ?? 0;
    this.namedClaims.set(key, seen + 1);
    const duplicate = !anonymous && seen > 0;
    const previous = this.previousElements.get(duplicate ? `${key}~${seen}` : key);
    let id = previous?.id ?? createId();
    if (this.usedIds.has(id)) {
      id = createId();
    }
    this.usedIds.add(id);
    const path = duplicate ? `${key}~${seen}` : key;
    this.pathByNewId.set(id, path);

    if (duplicate) {
      this.diagnostics.push({
        id: createId(),
        ruleId: DUPLICATE_DECLARATION_RULE_ID,
        severity: "error",
        message: `'${input.name}' is already declared in this scope`,
        elementIds: [id],
        dslSpan: input.span,
      });
    }

    if (input.span !== undefined) {
      this.sourceMap.entries.push({
        id,
        kind: "element",
        name: input.name,
        span: input.span,
      });
    }

    return {
      id,
      duplicate,
      previous: previous?.element,
    };
  }

  allocateRelationship(input: {
    sourceId: string;
    targetId: string;
    relationshipType: UmlRelationship["relationshipType"];
    name?: string;
    discriminator?: string;
    span?: DslSpan;
  }): RelationshipClaim {
    const base = [
      input.sourceId,
      input.targetId,
      input.relationshipType,
      input.name ?? "",
      input.discriminator ?? "",
    ].join("|");
    const ordinal = this.relationshipCounts.get(base) ?? 0;
    this.relationshipCounts.set(base, ordinal + 1);
    const previous = this.previousRelationships.get(`${base}#${ordinal}`);
    let id = previous?.id ?? createId();
    if (this.usedIds.has(id)) {
      id = createId();
    }
    this.usedIds.add(id);

    if (input.span !== undefined) {
      this.sourceMap.entries.push({
        id,
        kind: "relationship",
        name: input.name,
        span: input.span,
      });
    }

    return {
      id,
      previous: previous?.relationship,
    };
  }

  resolve(
    model: UmlModel,
    name: string,
    span: DslSpan | undefined,
    options?: {
      elementType?: UmlElement["elementType"];
      parentId?: string;
      report?: boolean;
    },
  ): string | undefined {
    const report = options?.report !== false;
    let candidates = model.elements.filter((element) => element.name === name);
    if (options?.elementType !== undefined) {
      const elementType = options.elementType;
      candidates = candidates.filter((element) => element.elementType === elementType);
    }
    if (options?.parentId !== undefined) {
      const parentId = options.parentId;
      candidates = candidates.filter((element) => element.parentId === parentId);
    }

    if (candidates.length === 1) {
      const match = candidates[0];
      if (match === undefined) {
        return undefined;
      }
      if (span !== undefined) {
        this.sourceMap.entries.push({
          id: match.id,
          kind: "reference",
          name,
          span,
        });
      }
      return match.id;
    }

    if (!report) {
      return undefined;
    }

    if (candidates.length === 0) {
      this.diagnostics.push({
        id: createId(),
        ruleId: UNRESOLVED_REFERENCE_RULE_ID,
        severity: "error",
        message: `'${name}' is not declared`,
        elementIds: [],
        dslSpan: span,
      });
      return undefined;
    }

    this.diagnostics.push({
      id: createId(),
      ruleId: AMBIGUOUS_REFERENCE_RULE_ID,
      severity: "error",
      message: `'${name}' matches more than one declaration`,
      elementIds: candidates.map((element) => element.id),
      dslSpan: span,
    });
    return undefined;
  }

  duplicate(name: string, span?: DslSpan, elementId?: string): void {
    this.diagnostics.push({
      id: createId(),
      ruleId: DUPLICATE_DECLARATION_RULE_ID,
      severity: "error",
      message: `'${name}' is already declared in this scope`,
      elementIds: elementId !== undefined ? [elementId] : [],
      dslSpan: span,
    });
  }

  unsupported(message: string, span?: DslSpan): void {
    this.diagnostics.push({
      id: createId(),
      ruleId: UNSUPPORTED_FEATURE_RULE_ID,
      severity: "error",
      message,
      elementIds: [],
      dslSpan: span,
    });
  }

  private nextAnonymousKey(parentPath: string, elementType: UmlElement["elementType"]): string {
    const counterKey = `${parentPath}/anon:${elementType}`;
    const ordinal = this.anonCounts.get(counterKey) ?? 0;
    this.anonCounts.set(counterKey, ordinal + 1);
    return `${counterKey}#${ordinal}`;
  }

  private indexElements(model: UmlModel): void {
    const pending = model.elements.map((element, index) => ({ element, index }));
    const pathByOldId = new Map<string, string>();
    const namedSeen = new Map<string, number>();
    const anonSeen = new Map<string, number>();
    let guard = 0;

    while (pending.length > 0 && guard <= model.elements.length) {
      guard += 1;
      let progressed = false;

      for (let index = 0; index < pending.length; index += 1) {
        const item = pending[index];
        if (item === undefined) {
          continue;
        }
        const parentId = item.element.parentId;
        if (parentId !== undefined && !pathByOldId.has(parentId)) {
          const parentExists = model.elements.some((element) => element.id === parentId);
          if (parentExists) {
            continue;
          }
        }

        const parentPath = parentId !== undefined ? pathByOldId.get(parentId) ?? "" : "";
        const anonymous = ANONYMOUS_ELEMENT_TYPES.has(item.element.elementType);
        let key: string;
        if (anonymous) {
          const counterKey = `${parentPath}/anon:${item.element.elementType}`;
          const ordinal = anonSeen.get(counterKey) ?? 0;
          anonSeen.set(counterKey, ordinal + 1);
          key = `${counterKey}#${ordinal}`;
        } else {
          key = `${parentPath}/${item.element.elementType}:${item.element.name}`;
          const seen = namedSeen.get(key) ?? 0;
          namedSeen.set(key, seen + 1);
          if (seen > 0) {
            key = `${key}~${seen}`;
          }
        }

        pathByOldId.set(item.element.id, key);
        this.previousElements.set(key, { id: item.element.id, element: item.element });
        pending.splice(index, 1);
        index -= 1;
        progressed = true;
      }

      if (!progressed) {
        break;
      }
    }
  }

  private indexRelationships(model: UmlModel): void {
    const counts = new Map<string, number>();
    for (const relationship of model.relationships) {
      const discriminator =
        relationship.relationshipType === "message" ? relationship.messageSort : "";
      const base = [
        relationship.sourceId,
        relationship.targetId,
        relationship.relationshipType,
        relationship.name ?? "",
        discriminator,
      ].join("|");
      const ordinal = counts.get(base) ?? 0;
      counts.set(base, ordinal + 1);
      this.previousRelationships.set(`${base}#${ordinal}`, {
        id: relationship.id,
        relationship,
      });
    }
  }
}

export type BuildContext = {
  identity: IdentityTable;
};

export function createBuildContext(previous?: UmlModel): BuildContext {
  return { identity: new IdentityTable(previous) };
}
