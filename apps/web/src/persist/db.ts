import Dexie, { type Table } from "dexie";
import type { GraphiqDocument } from "../store/documentStore.js";

export type PersistedDocumentRow = GraphiqDocument & {
  updatedAt: number;
};

export type MetaRow = {
  key: string;
  value: string;
};

export const LAST_OPEN_ID_META_KEY = "lastOpenId";

export class GraphiqDb extends Dexie {
  documents!: Table<PersistedDocumentRow, string>;
  meta!: Table<MetaRow, string>;

  constructor() {
    super("graphiq");
    this.version(1).stores({
      documents: "id, kind, updatedAt",
      meta: "key",
    });
  }
}

export const graphiqDb = new GraphiqDb();
