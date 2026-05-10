function parseModelList(value: string | undefined) {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

const configuredModels = parseModelList(process.env.OPENAI_MODELS);
const legacyModel = process.env.OPENAI_MODEL?.trim();
const defaultConfiguredModel =
  process.env.OPENAI_DEFAULT_MODEL?.trim() || legacyModel || configuredModels[0];

export const env = {
  openAiApiKey: process.env.OPENAI_API_KEY,
  openAiModel: defaultConfiguredModel ?? "gpt-4.1-mini",
  openAiModels:
    configuredModels.length > 0
      ? configuredModels
      : [defaultConfiguredModel ?? "gpt-4.1-mini"],
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

export function getConfiguredModels() {
  return env.openAiModels;
}

export function getDefaultOpenAiModel() {
  return env.openAiModel;
}
