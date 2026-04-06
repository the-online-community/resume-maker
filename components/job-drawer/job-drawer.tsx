"use client";

import {
  Loading03Icon,
  Mic01Icon,
  PauseIcon,
  Cancel01Icon,
  SquareArrowExpand01Icon,
  SquareArrowShrink01Icon,
  ArrowDown01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useSpeechToText } from "@/hooks/use-speech-to-text";
import type { UserProfile } from "@/lib/profile";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
}

interface JobAnalysis {
  skills: string[];
  summary: string;
}

interface JobDrawerProps {
  open: boolean;
  onClose: () => void;
  jobDescription: string;
  userProfile: UserProfile;
  model: string;
  onWriteResume: (instructions: string) => void;
}

// ── Main Component ────────────────────────────────────────────────────────────

export function JobDrawer({
  open,
  onClose,
  jobDescription,
  userProfile,
  model,
  onWriteResume,
}: JobDrawerProps) {
  const [expanded, setExpanded] = useState(false);
  const [analysisCollapsed, setAnalysisCollapsed] = useState(false);
  const [analysis, setAnalysis] = useState<JobAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [input, setInput] = useState("");
  const hasAnalyzed = useRef(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Auto-analyze when drawer opens (once per job description)
  useEffect(() => {
    if (!open || !jobDescription.trim() || hasAnalyzed.current) return;

    hasAnalyzed.current = true;
    setIsAnalyzing(true);
    setAnalysis(null);

    fetch("/api/analyze-job", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobDescription, userProfile, model }),
    })
      .then((res) => res.json())
      .then((data: JobAnalysis) => setAnalysis(data))
      .catch(() => {
        setAnalysis({ skills: [], summary: "Could not analyze job description." });
      })
      .finally(() => setIsAnalyzing(false));
  }, [open, jobDescription, userProfile, model]);

  // Reset analysis when job description changes
  useEffect(() => {
    hasAnalyzed.current = false;
    setAnalysis(null);
    setMessages([]);
  }, [jobDescription]);

  // Scroll to bottom when messages update
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isChatLoading) return;

    const userMsg: ChatMessage = { role: "user", content: text };
    const assistantMsg: ChatMessage = {
      role: "assistant",
      content: "",
      isStreaming: true,
    };
    const msgId = messages.length + 1; // index of assistant message

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInput("");
    setIsChatLoading(true);

    try {
      const allMessages = [...messages, userMsg];
      const res = await fetch("/api/job-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: allMessages.map(({ role, content }) => ({ role, content })),
          jobDescription,
          userProfile,
          model,
        }),
      });

      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        setMessages((prev) =>
          prev.map((m, i) =>
            i === prev.length - 1
              ? { ...m, content: m.content + chunk }
              : m,
          ),
        );
      }

      // Mark streaming done
      setMessages((prev) =>
        prev.map((m, i) =>
          i === prev.length - 1 ? { ...m, isStreaming: false } : m,
        ),
      );
    } catch {
      setMessages((prev) =>
        prev.map((m, i) =>
          i === prev.length - 1
            ? { ...m, content: "Sorry, something went wrong.", isStreaming: false }
            : m,
        ),
      );
    } finally {
      setIsChatLoading(false);
    }
  }, [input, isChatLoading, messages, jobDescription, userProfile, model]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleWriteResume = () => {
    if (messages.length === 0) {
      onWriteResume("");
      return;
    }

    const transcript = messages
      .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
      .join("\n\n");

    const instructions = `Based on this conversation about the job:\n\n${transcript}\n\nPlease tailor my resume accordingly, following any specific instructions mentioned above.`;
    onWriteResume(instructions);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-300 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div
        className={`fixed top-0 left-0 z-50 flex h-full min-w-[420px] flex-col bg-background shadow-2xl transition-all duration-300 ease-in-out ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ width: expanded ? "35vw" : "420px", maxWidth: "90vw" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="font-mono font-semibold">Job Assistant</h2>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setExpanded((e) => !e)}
              className="text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
              aria-label={expanded ? "Shrink drawer" : "Expand drawer"}
            >
              <HugeiconsIcon
                icon={expanded ? SquareArrowShrink01Icon : SquareArrowExpand01Icon}
                className="size-4"
              />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
              aria-label="Close drawer"
            >
              <HugeiconsIcon icon={Cancel01Icon} className="size-4" />
            </button>
          </div>
        </div>

        {/* Analysis section */}
        <div className="border-b px-4 py-4">
          <button
            type="button"
            onClick={() => setAnalysisCollapsed((c) => !c)}
            className="flex w-full cursor-pointer items-center justify-between"
          >
            <p className="text-muted-foreground font-mono text-xs uppercase tracking-wider">
              Job Analysis
            </p>
            <HugeiconsIcon
              icon={ArrowDown01Icon}
              className={`text-muted-foreground size-4 transition-transform duration-200 ${
                analysisCollapsed ? "-rotate-90" : ""
              }`}
            />
          </button>

          {!analysisCollapsed && (
            <div className="mt-3">
              {isAnalyzing ? (
                <div className="space-y-2">
                  {/* Skills skeleton */}
                  <div className="flex flex-wrap gap-1.5">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div
                        key={i}
                        className="bg-muted h-5 animate-pulse rounded-sm"
                        style={{ width: `${60 + (i % 3) * 20}px` }}
                      />
                    ))}
                  </div>
                  {/* Summary skeleton */}
                  <div className="space-y-1.5 pt-1">
                    <div className="bg-muted h-3 w-full animate-pulse rounded" />
                    <div className="bg-muted h-3 w-4/5 animate-pulse rounded" />
                    <div className="bg-muted h-3 w-3/5 animate-pulse rounded" />
                  </div>
                </div>
              ) : analysis ? (
                <div className="space-y-3">
                  {analysis.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {analysis.skills.map((skill) => (
                        <span
                          key={skill}
                          className="bg-secondary text-secondary-foreground rounded-sm px-2 py-0.5 font-mono text-xs"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {analysis.summary}
                  </p>
                </div>
              ) : (
                <p className="text-muted-foreground text-xs">
                  Paste a job description to analyze it.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Chat section */}
        <div
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto px-4 py-4"
        >
          {messages.length === 0 ? (
            <div className="text-muted-foreground flex h-full flex-col items-center justify-center text-center text-sm">
              <p>Chat with the job assistant</p>
              <p className="mt-1 text-xs">
                Ask about the role, assess your fit, or get resume advice
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {messages.map((msg, i) => (
                <ChatBubble key={i} message={msg} />
              ))}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* Input area */}
        <div className="border-t px-4 py-3">
          <div className="relative">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder='Ask about the role or say "write my resume focused on X"...'
              className="min-h-16 resize-none pr-10 text-sm"
              disabled={isChatLoading}
            />
            <VoiceButton
              onTranscript={(text) =>
                setInput((prev) => (prev ? `${prev} ${text}` : text))
              }
            />
          </div>
          <div className="mt-2 flex items-center justify-between">
            <p className="text-muted-foreground text-xs">⌘↵ to send</p>
            <Button
              size="sm"
              onClick={handleSend}
              disabled={!input.trim() || isChatLoading}
            >
              {isChatLoading ? "..." : "Send"}
            </Button>
          </div>
        </div>

        {/* Footer — Write Resume */}
        <div className="border-t px-4 py-3">
          <Button
            className="w-full"
            onClick={handleWriteResume}
            disabled={isChatLoading}
          >
            Write Resume
          </Button>
        </div>
      </div>
    </>
  );
}

// ── Chat Bubble ───────────────────────────────────────────────────────────────

function ChatBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded px-3 py-2 text-sm leading-relaxed ${
          isUser
            ? "bg-foreground text-background"
            : "bg-muted text-foreground"
        }`}
      >
        {message.isStreaming && !message.content ? (
          <div className="flex gap-1 py-0.5">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="bg-muted-foreground/40 inline-block size-1.5 rounded-full"
                style={{
                  animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                }}
              />
            ))}
          </div>
        ) : (
          <p className="whitespace-pre-wrap">{message.content}</p>
        )}
      </div>
    </div>
  );
}

// ── Voice Button ──────────────────────────────────────────────────────────────

function VoiceButton({ onTranscript }: { onTranscript: (text: string) => void }) {
  const { isListening, isProcessing, isSupported, toggle } = useSpeechToText({
    onTranscript,
  });

  if (!isSupported) return null;

  const showLoading = isListening && isProcessing;

  return (
    <button
      type="button"
      onClick={toggle}
      className={`absolute right-2 bottom-2 flex size-7 cursor-pointer items-center justify-center rounded-full transition-all ${
        isListening
          ? "bg-destructive text-white"
          : "text-muted-foreground hover:text-foreground hover:bg-muted"
      }`}
      aria-label={isListening ? "Stop recording" : "Start voice input"}
    >
      {showLoading ? (
        <HugeiconsIcon icon={Loading03Icon} className="size-3.5 animate-spin" />
      ) : (
        <HugeiconsIcon
          icon={isListening ? PauseIcon : Mic01Icon}
          className="size-3.5"
        />
      )}
    </button>
  );
}
