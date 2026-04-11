"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MODELS } from "@/lib/models";

export function ModelSelector({
  selectedModelId,
  onModelChange,
}: {
  selectedModelId: string;
  onModelChange: (modelId: string) => void;
}) {
  const selectedModel =
    MODELS.find((m) => m.id === selectedModelId) ?? MODELS[0];
  const openaiModels = MODELS.filter((m) => m.provider === "openai");
  const anthropicModels = MODELS.filter((m) => m.provider === "anthropic");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground flex shrink-0 cursor-pointer items-center gap-1 text-xs transition-colors"
        >
          <span>{selectedModel.label}</span>
          <svg
            className="size-3"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-auto min-w-40">
        <DropdownMenuLabel>OpenAI</DropdownMenuLabel>
        <DropdownMenuGroup>
          {openaiModels.map((model) => (
            <DropdownMenuItem
              key={model.id}
              onSelect={() => onModelChange(model.id)}
            >
              {model.label}
              {model.id === selectedModelId && (
                <span className="text-primary ml-auto">✓</span>
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Anthropic</DropdownMenuLabel>
        <DropdownMenuGroup>
          {anthropicModels.map((model) => (
            <DropdownMenuItem
              key={model.id}
              onSelect={() => onModelChange(model.id)}
            >
              {model.label}
              {model.id === selectedModelId && (
                <span className="text-primary ml-auto">✓</span>
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
