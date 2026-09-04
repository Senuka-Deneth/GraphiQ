import ELK from "elkjs/lib/elk.bundled.js";

const elk = new ELK();

export type ElkGraphInput = {
  id: string;
  layoutOptions?: Record<string, string>;
  children?: ElkGraphInput[];
  edges?: {
    id: string;
    sources: string[];
    targets: string[];
  }[];
  width?: number;
  height?: number;
  x?: number;
  y?: number;
};

export type ElkGraphOutput = ElkGraphInput & {
  children?: ElkGraphOutput[];
  edges?: {
    id: string;
    sources: string[];
    targets: string[];
    sections?: {
      id?: string;
      startPoint: { x: number; y: number };
      endPoint: { x: number; y: number };
      bendPoints?: { x: number; y: number }[];
    }[];
  }[];
};

export async function layoutWithElk(graph: ElkGraphInput): Promise<ElkGraphOutput> {
  return (await elk.layout(graph)) as ElkGraphOutput;
}
