export const CLAUDE_MODELS = {
  "claude-haiku-4-5-20251001": "Haiku 4.5 (빠름·저렴)",
  "claude-sonnet-4-6": "Sonnet 4.6 (균형)",
} as const;

export type ClaudeModelId = keyof typeof CLAUDE_MODELS;

export const DEFAULT_MODEL: ClaudeModelId = "claude-haiku-4-5-20251001";
