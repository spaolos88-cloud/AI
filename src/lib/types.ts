export type ChatRole = "user" | "assistant";

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
};

export type ChatRequest = {
  conversationId: string;
  messages: ChatMessage[];
};

export type StorageStatus = {
  enabled: boolean;
  saved: boolean;
  message: string;
};

export type ChatResponse = {
  message: ChatMessage;
  storage: StorageStatus;
};
