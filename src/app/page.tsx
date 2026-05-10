import { AssistantShell } from "@/components/assistant-shell";
import { getConfiguredModels, getDefaultOpenAiModel } from "@/lib/env";

export default function Home() {
  return (
    <AssistantShell
      availableModels={getConfiguredModels()}
      defaultModel={getDefaultOpenAiModel()}
    />
  );
}
