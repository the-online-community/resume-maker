export type ModelProvider = "openai" | "anthropic";

export interface AIModel {
  id: string;
  label: string;
  provider: ModelProvider;
}

export const MODELS: AIModel[] = [
  { id: "gpt-5-mini", label: "GPT-5 mini", provider: "openai" },
  { id: "gpt-4o", label: "GPT-4o", provider: "openai" },
  {
    id: "claude-haiku-4-5-20251001",
    label: "Claude Haiku",
    provider: "anthropic",
  },
  { id: "claude-sonnet-4-6", label: "Claude Sonnet", provider: "anthropic" },
  { id: "claude-opus-4-6", label: "Claude Opus", provider: "anthropic" },
];

export const DEFAULT_MODEL_ID = "gpt-5-mini";
