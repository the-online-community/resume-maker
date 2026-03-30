"use client";

import { Copy01Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

interface ProposalPreviewProps {
  proposal: string;
  isLoading: boolean;
  isStreaming: boolean;
  onRefine: (instruction: string) => void;
  onProposalChange: (text: string) => void;
}

export function ProposalPreview({
  proposal,
  isLoading,
  isStreaming,
  onRefine,
  onProposalChange,
}: ProposalPreviewProps) {
  const [copied, setCopied] = useState(false);
  const [refineText, setRefineText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Seed content on mount (handles tab switching — component unmounts/remounts)
  useEffect(() => {
    if (contentRef.current && proposal) {
      contentRef.current.innerText = proposal;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // While streaming, push each chunk into the div via the ref.
  // We never touch it after streaming stops so user edits are preserved.
  useEffect(() => {
    if (!isStreaming || !contentRef.current) return;
    contentRef.current.innerText = proposal;
  }, [proposal, isStreaming]);

  const handleCopy = useCallback(async () => {
    if (!proposal) return;
    await navigator.clipboard.writeText(proposal);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [proposal]);

  const handleRefine = useCallback(() => {
    const instruction = refineText.trim();
    if (!instruction || isStreaming || isLoading) return;
    onRefine(instruction);
    setRefineText("");
  }, [refineText, isStreaming, isLoading, onRefine]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleRefine();
    }
  };

  // ── Loading skeleton ───────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-96 border p-8">
        <Skeleton className="mb-3 h-4 w-full" />
        <Skeleton className="mb-3 h-4 w-5/6" />
        <Skeleton className="mb-3 h-4 w-full" />
        <Skeleton className="mb-6 h-4 w-4/5" />
        <Skeleton className="mb-3 h-4 w-full" />
        <Skeleton className="mb-3 h-4 w-3/4" />
        <Skeleton className="h-4 w-full" />
      </div>
    );
  }

  // ── Empty state ────────────────────────────────────────────────────────────
  if (!proposal) {
    return (
      <div className="text-muted-foreground flex min-h-96 flex-col items-center justify-center border p-10 text-center text-sm">
        <p>Your proposal will appear here</p>
        <p className="mt-1 text-xs">
          Paste a job posting and click &quot;Generate Proposal&quot;
        </p>
      </div>
    );
  }

  // ── Proposal ───────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4">
      {/* Letter body */}
      <div className="relative border bg-white p-8 dark:bg-zinc-900">
        {/* Copy button — top right */}
        {!isStreaming && (
          <button
            type="button"
            onClick={handleCopy}
            className="text-muted-foreground hover:text-foreground absolute top-3 right-3 flex cursor-pointer items-center gap-1 text-xs transition-colors"
            aria-label="Copy proposal"
          >
            <HugeiconsIcon
              icon={copied ? Tick02Icon : Copy01Icon}
              className="size-3.5"
            />
            {copied ? "Copied!" : "Copy"}
          </button>
        )}

        {/* Proposal text — editable once streaming is done.
            No React children — all content is written via the ref to avoid
            reconciler conflicts with contentEditable. */}
        <div
          ref={contentRef}
          contentEditable={!isStreaming}
          suppressContentEditableWarning
          onInput={() => {
            if (contentRef.current) onProposalChange(contentRef.current.innerText);
          }}
          className="text-foreground/90 min-h-8 whitespace-pre-wrap text-sm leading-relaxed outline-none"
          style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
        />
      </div>

      {/* Word count */}
      {!isStreaming && (
        <p className="text-muted-foreground text-right text-xs">
          {proposal.trim().split(/\s+/).filter(Boolean).length} words
        </p>
      )}

      {/* Refine with AI */}
      {!isStreaming && (
        <div className="border p-4">
          <p className="text-muted-foreground mb-2 text-xs font-medium">
            Refine with AI
          </p>
          <div className="flex gap-2">
            <Textarea
              ref={textareaRef}
              value={refineText}
              onChange={(e) => setRefineText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder='e.g. "Make it shorter", "Sound more confident", "Emphasize my React experience"...'
              className="min-h-16 flex-1 resize-none text-xs"
            />
            <Button
              size="sm"
              className="shrink-0 self-end"
              onClick={handleRefine}
              disabled={!refineText.trim() || isStreaming || isLoading}
            >
              Send
            </Button>
          </div>
          <p className="text-muted-foreground mt-1.5 text-xs">
            ⌘↵ to send
          </p>
        </div>
      )}
    </div>
  );
}
