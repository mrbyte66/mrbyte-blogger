export const previewEvents = {
  workspace: "mrbyte:preview",
  ready: "mrbyte:canvas-ready",
  selection: "mrbyte:canvas-selection",
  select: "mrbyte:select-block",
} as const;

export type CanvasSelection = { id: string | null; request: number; editing: boolean };
export function isBlockId(value: unknown): value is string {
  return typeof value === "string" && /^[a-zA-Z0-9-]{1,80}$/.test(value);
}
export function parseCanvasSelection(data: unknown): CanvasSelection | null {
  if (typeof data !== "object" || data === null) return null;
  const message = data as Record<string, unknown>;
  if (message.type !== previewEvents.selection || !(message.id === null || isBlockId(message.id)) || typeof message.request !== "number" || !Number.isSafeInteger(message.request) || message.request < 0 || typeof message.editing !== "boolean") return null;
  return { id: message.id, request: message.request, editing: message.editing };
}
