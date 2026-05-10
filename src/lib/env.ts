export const env = {
  openAiApiKey: process.env.OPENAI_API_KEY,
  openAiModel: process.env.OPENAI_MODEL ?? "gpt-5.2",
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
