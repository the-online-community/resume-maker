"use client";

import { useCallback, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

interface AnalysisSuggestion {
  id: string;
  section: string;
  title: string;
  description: string;
  currentText: string;
  suggestedText: string;
}

interface AnalysisResult {
  score: number;
  summary: string;
  suggestions: AnalysisSuggestion[];
}

interface ResumeAnalyzerDialogProps {
  placeholders: Record<string, string> | null;
  jobDescription: string;
  onAcceptSuggestion: (section: string, newText: string) => void;
  disabled?: boolean;
  label?: string;
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

function ScoreBadge({ score }: { score: number }) {
  let color: string;
  let label: string;

  if (score >= 75) {
    color =
      "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
    label = "Strong";
  } else if (score >= 50) {
    color =
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
    label = "Moderate";
  } else {
    color = "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
    label = "Needs Work";
  }

  return (
    <div className="flex items-center gap-3">
      <div
        className={`flex h-14 w-14 items-center justify-center rounded-full text-lg font-bold ${color}`}
      >
        {score}
      </div>
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-muted-foreground text-xs">ATS Match Score</p>
      </div>
    </div>
  );
}

function SuggestionCard({
  suggestion,
  onAccept,
  onDismiss,
}: {
  suggestion: AnalysisSuggestion;
  onAccept: () => void;
  onDismiss: () => void;
}) {
  const [showDiff, setShowDiff] = useState(false);

  const sectionLabels: Record<string, string> = {
    SUMMARY: "Summary",
    EXPERIENCE: "Experience",
    EDUCATION: "Education",
    SKILLS: "Skills",
    CERTIFICATIONS: "Certifications",
  };

  return (
    <div className="border p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <Badge
              variant="secondary"
              className="shrink-0 px-1.5 py-0 text-[10px]"
            >
              {sectionLabels[suggestion.section] || suggestion.section}
            </Badge>
            <p className="truncate text-sm font-medium">{suggestion.title}</p>
          </div>
          <p className="text-muted-foreground text-xs leading-relaxed">
            {suggestion.description}
          </p>
        </div>
      </div>

      {/* Toggle diff */}
      <button
        type="button"
        className="text-primary mt-2 cursor-pointer text-xs hover:underline"
        onClick={() => setShowDiff(!showDiff)}
      >
        {showDiff ? "Hide preview" : "Show preview"}
      </button>

      {showDiff && (
        <div className="mt-2 space-y-2">
          <div className="rounded border bg-red-50/50 p-2 dark:bg-red-950/20">
            <p className="mb-1 text-[10px] font-medium text-red-600 dark:text-red-400">
              Current
            </p>
            <p className="text-xs leading-relaxed whitespace-pre-line text-red-900 dark:text-red-200">
              {suggestion.currentText.slice(0, 500)}
              {suggestion.currentText.length > 500 ? "…" : ""}
            </p>
          </div>
          <div className="rounded border bg-green-50/50 p-2 dark:bg-green-950/20">
            <p className="mb-1 text-[10px] font-medium text-green-600 dark:text-green-400">
              Suggested
            </p>
            <p className="text-xs leading-relaxed whitespace-pre-line text-green-900 dark:text-green-200">
              {suggestion.suggestedText.slice(0, 500)}
              {suggestion.suggestedText.length > 500 ? "…" : ""}
            </p>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="mt-3 flex gap-2">
        <Button
          size="sm"
          className="h-7 bg-green-600 px-3 text-xs hover:bg-green-700"
          onClick={onAccept}
        >
          ✓ Apply
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-7 px-3 text-xs"
          onClick={onDismiss}
        >
          Dismiss
        </Button>
      </div>
    </div>
  );
}

export function ResumeAnalyzerDialog({
  placeholders,
  jobDescription,
  onAcceptSuggestion,
  disabled,
  label = "Analyze",
}: ResumeAnalyzerDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [acceptedIds, setAcceptedIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopProgress = useCallback(() => {
    if (progressRef.current) {
      clearInterval(progressRef.current);
      progressRef.current = null;
    }
  }, []);

  const startProgress = useCallback(() => {
    stopProgress();
    let p = 0;
    setProgress(0);
    progressRef.current = setInterval(() => {
      p += p < 50 ? 6 : p < 80 ? 3 : 0.5;
      p = Math.min(p, 95);
      setProgress(Math.round(p));
    }, 200);
  }, [stopProgress]);

  const analyze = useCallback(async () => {
    if (!placeholders || !jobDescription) return;

    setIsLoading(true);
    setResult(null);
    setDismissedIds(new Set());
    setAcceptedIds(new Set());
    setError(null);
    startProgress();

    try {
      const res = await fetch("/api/analyze-resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ placeholders, jobDescription }),
      });

      if (!res.ok) throw new Error("Analysis failed");

      const data = (await res.json()) as AnalysisResult;
      setProgress(100);
      setResult(data);
    } catch {
      setError("Failed to analyze resume. Please try again.");
    } finally {
      stopProgress();
      setIsLoading(false);
    }
  }, [placeholders, jobDescription, startProgress, stopProgress]);

  const handleButtonClick = useCallback(() => {
    if (result) {
      // Analysis already done — open the dialog
      setOpen(true);
    } else if (!isLoading) {
      // Start analysis in background
      analyze();
    }
  }, [result, isLoading, analyze]);

  const handleReanalyze = useCallback(() => {
    setOpen(false);
    analyze();
  }, [analyze]);

  const handleAccept = useCallback(
    (suggestion: AnalysisSuggestion) => {
      onAcceptSuggestion(suggestion.section, suggestion.suggestedText);
      setAcceptedIds((prev) => new Set(prev).add(suggestion.id));
    },
    [onAcceptSuggestion],
  );

  const handleDismiss = useCallback((id: string) => {
    setDismissedIds((prev) => new Set(prev).add(id));
  }, []);

  const visibleSuggestions =
    result?.suggestions.filter(
      (s) => !dismissedIds.has(s.id) && !acceptedIds.has(s.id),
    ) ?? [];

  const acceptedCount = acceptedIds.size;
  const totalCount = result?.suggestions.length ?? 0;

  const buttonLabel = isLoading
    ? `${progress}%`
    : result
      ? `${label}: ${result.score}`
      : label;

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        className="shrink-0 text-xs"
        disabled={disabled || !placeholders || !jobDescription}
        onClick={handleButtonClick}
      >
        {isLoading ? (
          <div className="border-primary mr-1.5 size-3 animate-spin rounded-full border-2 border-t-transparent" />
        ) : (
          <SparkleIcon className="mr-1.5 size-3" />
        )}
        {buttonLabel}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Resume Analysis</DialogTitle>
            <DialogDescription>
              How well your resume matches the job description
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="py-8 text-center">
              <p className="text-destructive text-sm">{error}</p>
              <Button
                size="sm"
                variant="outline"
                className="mt-3"
                onClick={handleReanalyze}
              >
                Try Again
              </Button>
            </div>
          )}

          {result && (
            <div className="space-y-4">
              {/* Score + Re-analyze */}
              <div className="flex items-center justify-between">
                <ScoreBadge score={result.score} />
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={handleReanalyze}
                  disabled={isLoading}
                >
                  Re-analyze
                </Button>
              </div>

              {/* Summary */}
              <p className="text-muted-foreground text-sm leading-relaxed">
                {result.summary}
              </p>

              <Separator />

              {/* Suggestions header */}
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">
                  Suggestions
                  {totalCount > 0 && (
                    <span className="text-muted-foreground ml-1.5 font-normal">
                      {acceptedCount > 0
                        ? `${acceptedCount}/${totalCount} applied`
                        : `${visibleSuggestions.length} remaining`}
                    </span>
                  )}
                </p>
                {visibleSuggestions.length === 0 && totalCount > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    All done ✓
                  </Badge>
                )}
              </div>

              {/* Suggestion cards */}
              {visibleSuggestions.length > 0 ? (
                <div className="space-y-3">
                  {visibleSuggestions.map((suggestion) => (
                    <SuggestionCard
                      key={suggestion.id}
                      suggestion={suggestion}
                      onAccept={() => handleAccept(suggestion)}
                      onDismiss={() => handleDismiss(suggestion.id)}
                    />
                  ))}
                </div>
              ) : (
                totalCount === 0 && (
                  <p className="text-muted-foreground py-4 text-center text-sm">
                    No suggestions — your resume looks great!
                  </p>
                )
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
