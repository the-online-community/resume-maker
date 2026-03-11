"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface AiSectionEditorProps {
  sectionKey: string;
  currentContent: string;
  jobDescription?: string;
  editable: boolean;
  children: React.ReactNode;
  onAccept: (newContent: string) => void;
}

/** Sparkle SVG icon */
function SparkleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3l1.912 5.813a2 2 0 0 0 1.275 1.275L21 12l-5.813 1.912a2 2 0 0 0-1.275 1.275L12 21l-1.912-5.813a2 2 0 0 0-1.275-1.275L3 12l5.813-1.912a2 2 0 0 0 1.275-1.275L12 3z" />
    </svg>
  );
}

// ── Quick-action presets ──

const QUICK_ACTIONS = [
  {
    label: "Make stronger",
    instruction:
      "Make this more impactful with stronger action verbs and quantified achievements",
  },
  {
    label: "Make shorter",
    instruction:
      "Make this more concise while keeping the key information",
  },
  {
    label: "Add stats",
    instruction:
      "Add realistic metrics and quantified results to strengthen this",
  },
] as const;

export function AiSectionEditor({
  sectionKey,
  currentContent,
  jobDescription,
  editable,
  children,
  onAccept,
}: AiSectionEditorProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamedContent, setStreamedContent] = useState("");
  const [isDone, setIsDone] = useState(false);
  const [selectedText, setSelectedText] = useState("");
  const sectionRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // ── Right-click context menu state ──
  const [contextMenuOpen, setContextMenuOpen] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });
  const [contextMenuText, setContextMenuText] = useState("");
  const [showCustomPrompt, setShowCustomPrompt] = useState(false);

  // Detect text selection within this section
  useEffect(() => {
    if (!editable) return;

    const handleSelection = () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || !sectionRef.current) {
        setSelectedText("");
        return;
      }

      const range = selection.getRangeAt(0);
      if (sectionRef.current.contains(range.commonAncestorContainer)) {
        setSelectedText(selection.toString().trim());
      } else {
        setSelectedText("");
      }
    };

    document.addEventListener("selectionchange", handleSelection);
    return () =>
      document.removeEventListener("selectionchange", handleSelection);
  }, [editable]);

  // ── Right-click handler ──
  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) return;

      const range = selection.getRangeAt(0);
      if (!sectionRef.current?.contains(range.commonAncestorContainer)) return;

      const text = selection.toString().trim();
      if (!text) return;

      e.preventDefault();
      setContextMenuText(text);
      setContextMenuPos({ x: e.clientX, y: e.clientY });
      setShowCustomPrompt(false);
      setPrompt("");
      setContextMenuOpen(true);
    },
    [],
  );

  // ── Submit AI edit ──
  const submitEdit = useCallback(
    async (instruction: string, textToEdit: string) => {
      setContextMenuOpen(false);
      setShowCustomPrompt(false);
      setIsStreaming(true);
      setStreamedContent("");
      setIsDone(false);
      setIsOpen(true);
      setSelectedText(textToEdit);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch("/api/edit-section", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sectionKey,
            currentContent,
            userInstruction: instruction,
            selectedText: textToEdit || undefined,
            jobDescription: jobDescription || undefined,
          }),
          signal: controller.signal,
        });

        if (!res.ok) throw new Error("Failed to edit section");

        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let accumulated = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          accumulated += decoder.decode(value, { stream: true });
          setStreamedContent(accumulated);
        }

        setIsDone(true);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          console.error("AI edit failed:", err);
        }
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [sectionKey, currentContent, jobDescription],
  );

  // ── Section-level edit (from hover button) ──
  const handleSectionSubmit = useCallback(async () => {
    if (!prompt.trim() || isStreaming) return;
    await submitEdit(prompt.trim(), selectedText);
  }, [prompt, isStreaming, selectedText, submitEdit]);

  const handleAccept = () => {
    onAccept(streamedContent);
    resetState();
  };

  const handleRevert = () => {
    resetState();
  };

  const resetState = () => {
    setIsOpen(false);
    setPrompt("");
    setStreamedContent("");
    setIsDone(false);
    setSelectedText("");
    setIsStreaming(false);
    setContextMenuOpen(false);
    setShowCustomPrompt(false);
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      if (isStreaming) return;
      resetState();
    }
    setIsOpen(open);
  };

  if (!editable) return <>{children}</>;

  return (
    <div
      ref={sectionRef}
      className="ai-section-wrapper"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onContextMenu={handleContextMenu}
    >
      {children}

      {/* Hover AI button — section-level editing */}
      <Popover open={isOpen} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <button
            className="ai-section-btn"
            style={{
              opacity: isHovered || isOpen ? 1 : 0,
              pointerEvents: isHovered || isOpen ? "auto" : "none",
            }}
            title="Edit with AI"
          >
            <SparkleIcon />
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="w-120 p-3"
          side="top"
          align="end"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          {/* Header */}
          <div className="text-primary mb-2 flex items-center gap-1.5 text-xs font-medium">
            <SparkleIcon className="h-3.5 w-3.5" />
            {selectedText
              ? "Edit selected text"
              : `Edit ${sectionKey.toLowerCase()}`}
          </div>

          {/* Selected text preview */}
          {selectedText && (
            <div className="bg-primary/10 text-primary mb-2 rounded px-2 py-1.5 text-xs">
              &ldquo;{selectedText.slice(0, 100)}
              {selectedText.length > 100 ? "…" : ""}&rdquo;
            </div>
          )}

          {/* Streamed content preview */}
          {streamedContent && (
            <div className="mb-2 max-h-40 overflow-y-auto rounded border bg-gray-50 p-2 text-xs whitespace-pre-line dark:bg-gray-900">
              {streamedContent}
              {isStreaming && (
                <span className="bg-primary ml-0.5 inline-block h-3 w-0.5 animate-pulse" />
              )}
            </div>
          )}

          {/* Input */}
          {!isDone && (
            <div className="flex gap-2">
              <Input
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g. make it more concise..."
                className="h-8 text-sm"
                disabled={isStreaming}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSectionSubmit();
                  }
                }}
                autoFocus
              />
              <Button
                size="sm"
                className="h-8 px-3"
                onClick={handleSectionSubmit}
                disabled={isStreaming || !prompt.trim()}
              >
                {isStreaming ? "..." : "→"}
              </Button>
            </div>
          )}

          {/* Accept / Revert */}
          {isDone && (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="h-8 flex-1"
                onClick={handleRevert}
              >
                ✕ Revert
              </Button>
              <Button
                size="sm"
                className="h-8 flex-1 bg-green-600 hover:bg-green-700"
                onClick={handleAccept}
              >
                ✓ Accept
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>

      {/* ── Right-click context menu (shadcn DropdownMenu) ── */}
      <DropdownMenu
        open={contextMenuOpen}
        onOpenChange={(open) => {
          if (!open) {
            setContextMenuOpen(false);
            setShowCustomPrompt(false);
          }
        }}
      >
        {/* Virtual trigger positioned at the right-click location */}
        <div
          style={{
            position: "fixed",
            left: contextMenuPos.x,
            top: contextMenuPos.y,
            width: 0,
            height: 0,
            pointerEvents: "none",
          }}
          data-slot="dropdown-menu-virtual-trigger"
        >
          {/* The DropdownMenuContent needs an anchor — this invisible div provides it */}
        </div>

        <DropdownMenuContent
          side="bottom"
          align="start"
          className="min-w-[200px]"
          style={{
            position: "fixed",
            left: contextMenuPos.x,
            top: contextMenuPos.y,
          }}
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          {/* Selected text preview */}
          <DropdownMenuLabel className="font-normal">
            <span className="flex items-center gap-1.5">
              <SparkleIcon className="h-3 w-3 shrink-0" />
              <span className="truncate">
                &ldquo;{contextMenuText.slice(0, 40)}
                {contextMenuText.length > 40 ? "…" : ""}&rdquo;
              </span>
            </span>
          </DropdownMenuLabel>

          <DropdownMenuSeparator />

          {/* Quick actions */}
          {QUICK_ACTIONS.map((action) => (
            <DropdownMenuItem
              key={action.label}
              onClick={() => submitEdit(action.instruction, contextMenuText)}
            >
              {action.label}
            </DropdownMenuItem>
          ))}

          <DropdownMenuSeparator />

          {/* Custom prompt */}
          {!showCustomPrompt ? (
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault();
                setShowCustomPrompt(true);
              }}
            >
              Custom prompt…
            </DropdownMenuItem>
          ) : (
            <div className="flex gap-1 p-1.5" onClick={(e) => e.stopPropagation()}>
              <Input
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Your instruction..."
                className="h-7 text-xs"
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === "Enter" && prompt.trim()) {
                    e.preventDefault();
                    submitEdit(prompt.trim(), contextMenuText);
                  }
                }}
                autoFocus
              />
              <Button
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => {
                  if (prompt.trim())
                    submitEdit(prompt.trim(), contextMenuText);
                }}
                disabled={!prompt.trim()}
              >
                →
              </Button>
            </div>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
