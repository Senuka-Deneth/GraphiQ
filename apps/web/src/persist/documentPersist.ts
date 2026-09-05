import type { GraphiqDocument } from "../store/documentStore.js";
import {
  graphiqDb,
  LAST_OPEN_ID_META_KEY,
  type PersistedDocumentRow,
} from "./db.js";

export async function saveDocument(document: GraphiqDocument): Promise<void> {
  const row: PersistedDocumentRow = {
    ...document,
    updatedAt: Date.now(),
  };
  await graphiqDb.documents.put(row);
}

export async function setLastOpenId(id: string): Promise<void> {
  await graphiqDb.meta.put({ key: LAST_OPEN_ID_META_KEY, value: id });
}

export async function getLastOpenId(): Promise<string | undefined> {
  const row = await graphiqDb.meta.get(LAST_OPEN_ID_META_KEY);
  return row?.value;
}

export async function loadDocument(id: string): Promise<GraphiqDocument | undefined> {
  const row = await graphiqDb.documents.get(id);
  if (row === undefined) {
    return undefined;
  }
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    model: row.model,
    overlay: row.overlay,
    dsl: row.dsl,
  };
}

export async function loadLastDocument(): Promise<GraphiqDocument | undefined> {
  const lastOpenId = await getLastOpenId();
  if (lastOpenId === undefined) {
    return undefined;
  }
  return loadDocument(lastOpenId);
}

export async function clearPersistedData(): Promise<void> {
  await graphiqDb.documents.clear();
  await graphiqDb.meta.clear();
}
