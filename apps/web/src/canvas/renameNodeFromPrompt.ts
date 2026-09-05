import { type Node } from "@xyflow/react";

export function renameNodeFromPrompt(
  node: Node,
  rename: (id: string, name: string) => Promise<void>,
): void {
  const data = node.data;
  let currentName = "";
  if (typeof data === "object" && data !== null) {
    if ("label" in data && typeof data.label === "string") {
      currentName = data.label;
    } else if ("instanceName" in data && typeof data.instanceName === "string") {
      currentName = data.instanceName;
    }
  }
  const nextName = window.prompt("Rename element", currentName);
  if (nextName !== null && nextName.trim().length > 0) {
    void rename(node.id, nextName.trim());
  }
}
