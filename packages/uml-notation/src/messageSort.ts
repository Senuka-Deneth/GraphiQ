export const MESSAGE_SORTS = [
  "synchCall",
  "asynchCall",
  "asynchSignal",
  "reply",
  "createMessage",
  "deleteMessage",
] as const;

export type MessageSort = (typeof MESSAGE_SORTS)[number];
