export const env = {
  openAiApiKey: process.env.OPENAI_API_KEY,
  openAiModel: process.env.OPENAI_MODEL ?? "gpt-5.2",
  openAiAssistantId: process.env.OPENAI_ASSISTANT_ID,
  googleDriveAccessToken: process.env.GOOGLE_DRIVE_ACCESS_TOKEN,
  googleDriveRootFolder:
    process.env.GOOGLE_DRIVE_ROOT_FOLDER ?? "Serio Assistant AI 01",
};

export function requireOpenAiKey() {
  if (!env.openAiApiKey) {
    throw new Error("Missing OPENAI_API_KEY in environment variables.");
  }

  return env.openAiApiKey;
}

export function requireOpenAiAssistantId() {
  if (!env.openAiAssistantId) {
    throw new Error("Missing OPENAI_ASSISTANT_ID in environment variables.");
  }

  return env.openAiAssistantId;
}
