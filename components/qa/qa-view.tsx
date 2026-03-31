"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export interface QAItem {
  id: string;
  question: string;
  answer: string;
  isStreaming: boolean;
}

interface QAViewProps {
  items: QAItem[];
  isLoading: boolean;
  onAsk: (question: string) => void;
  onAnswerChange: (id: string, answer: string) => void;
}

export function QAView({ items, isLoading, onAsk, onAnswerChange }: QAViewProps) {
  const [question, setQuestion] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when a new item is added
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [items.length]);

  const handleSubmit = useCallback(() => {
    const q = question.trim();
    if (!q || isLoading) return;
    onAsk(q);
    setQuestion("");
  }, [question, isLoading, onAsk]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Empty state */}
      {items.length === 0 && (
        <div className="text-muted-foreground flex min-h-64 flex-col items-center justify-center border p-10 text-center text-sm">
          <p>Ask any interview question</p>
          <p className="mt-1 text-xs">
            Answers are tailored to the job description and your profile
          </p>
        </div>
      )}

      {/* Q&A list */}
      {items.length > 0 && (
        <div className="flex flex-col gap-6">
          {items.map((item) => (
            <QAItemCard
              key={item.id}
              item={item}
              onAnswerChange={onAnswerChange}
            />
          ))}
          <div ref={bottomRef} />
        </div>
      )}

      {/* Input */}
      <div className="border p-4">
        <div className="flex gap-2">
          <Textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder='e.g. "Tell me about yourself", "Why do you want this role?", "Describe a challenging project..."'
            className="min-h-16 flex-1 resize-none text-xs"
            disabled={isLoading}
          />
          <Button
            size="sm"
            className="shrink-0 self-end"
            onClick={handleSubmit}
            disabled={!question.trim() || isLoading}
          >
            {isLoading ? "..." : "Ask"}
          </Button>
        </div>
        <p className="text-muted-foreground mt-1.5 text-xs">⌘↵ to ask</p>
      </div>
    </div>
  );
}

// ── Individual Q&A card ────────────────────────────────────────────────────

function QAItemCard({
  item,
  onAnswerChange,
}: {
  item: QAItem;
  onAnswerChange: (id: string, answer: string) => void;
}) {
  const answerRef = useRef<HTMLDivElement>(null);

  // Seed content on mount (handles remounts from tab switching)
  useEffect(() => {
    if (answerRef.current && item.answer) {
      answerRef.current.innerText = item.answer;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Push streaming chunks into the div
  useEffect(() => {
    if (!item.isStreaming || !answerRef.current) return;
    answerRef.current.innerText = item.answer;
  }, [item.answer, item.isStreaming]);

  return (
    <div className="space-y-3">
      {/* Question */}
      <p className="font-mono text-sm font-medium">Q: {item.question}</p>

      {/* Answer */}
      <div className="border-l-2 border-foreground/20 pl-4">
        {item.isStreaming && !item.answer ? (
          // Thinking indicator before first chunk arrives
          <div className="flex gap-1 py-1">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="bg-muted-foreground/40 inline-block size-1.5 rounded-full"
                style={{ animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }}
              />
            ))}
          </div>
        ) : (
          <div
            ref={answerRef}
            contentEditable={!item.isStreaming}
            suppressContentEditableWarning
            onInput={() => {
              if (answerRef.current)
                onAnswerChange(item.id, answerRef.current.innerText);
            }}
            className="text-foreground/90 min-h-4 whitespace-pre-wrap text-sm leading-relaxed outline-none"
          />
        )}
      </div>
    </div>
  );
}
