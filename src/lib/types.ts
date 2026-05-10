export type ChatRole = "user" | "assistant";

export type ChatAttachmentKind = "image" | "video" | "file";

export type ChatAttachment = {
  id: string;
  name: string;
  mimeType: string;
  kind: ChatAttachmentKind;
  sizeBytes: number;
  dataUrl: string;
};

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
  attachments?: ChatAttachment[];
};

export type ChatRequest = {
  conversationId: string;
  messages: ChatMessage[];
  model?: string;
};

export type StorageStatus = {
  enabled: boolean;
  saved: boolean;
  message: string;
};

export type ChatResponse = {
  message: ChatMessage;
  modelUsed: string;
  storage: StorageStatus;
};
