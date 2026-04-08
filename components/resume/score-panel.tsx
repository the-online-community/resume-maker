"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { KeywordFix, ScoreResult } from "@/lib/score-types";

interface ScorePanelProps {
  result: ScoreResult | null;
  isLoading: boolean;
  progress: number;
  acceptedIds: Set<string>;
  skippedIds: Set<string>;
  staleIds: Set<string>;
  onAcceptFix: (fix: KeywordFix) => void;
  onSkipFix: (fixId: string) => void;
  onAcceptAll: () => void;
  onReanalyze: () => void;
  onClose: () => void;
}

function ScoreRing({ score }: { score: number }) {
  let color: string;

  if (score >= 75) {
    color = "text-green-600 dark:text-green-400";
  } else if (score >= 50) {
    color = "text-yellow-600 dark:text-yellow-400";
  } else {
    color = "text-red-600 dark:text-red-400";
  }

  return (
    <div className="flex items-center gap-2.5">
      <span className={`text-2xl font-bold tabular-nums ${color}`}>
        {score}
      </span>
      <div>
        <p className="text-xs font-medium">ATS Score</p>
        <p className="text-muted-foreground text-[10px]">
          {score >= 75 ? "Strong match" : score >= 50 ? "Moderate match" : "Needs work"}
        </p>
      </div>
    </div>
  );
}

function FixRow({
  fix,
  status,
  isStale,
  onAccept,
  onSkip,
}: {
  fix: KeywordFix;
  status: "pending" | "accepted" | "skipped";
  isStale: boolean;
  onAccept: () => void;
  onSkip: () => void;
}) {
  if (status === "skipped") return null;

  const sectionLabels: Record<string, string> = {
    SUMMARY: "Summary",
    EXPERIENCE: "Experience",
    SKILLS: "Skills",
    EDUCATION: "Education",
    CERTIFICATIONS: "Certs",
  };

  return (
    <div
      className={`flex items-start gap-2 border p-2.5 transition-opacity ${
        status === "accepted" ? "opacity-50" : ""
      }`}
    >
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex flex-wrap items-center gap-1.5">
          <Badge variant="default" className="px-1.5 py-0 text-[10px]">
            {fix.keyword}
          </Badge>
          <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
            {sectionLabels[fix.section] || fix.section}
          </Badge>
        </div>
        <p className="text-muted-foreground text-xs">{fix.action}</p>
        {isStale && status === "pending" && (
          <p className="mt-1 text-[10px] text-amber-500">
            Text has changed — fix may not apply cleanly
          </p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {status === "accepted" ? (
          <span className="text-[10px] text-green-600 dark:text-green-400">Applied ✓</span>
        ) : (
          <>
            <button
              type="button"
              className="flex h-6 w-6 cursor-pointer items-center justify-center text-green-600 transition-colors hover:bg-green-600/10 dark:text-green-400"
              onClick={onAccept}
              disabled={isStale}
              title="Apply fix"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </button>
            <button
              type="button"
              className="text-muted-foreground flex h-6 w-6 cursor-pointer items-center justify-center transition-colors hover:bg-red-500/10 hover:text-red-500"
              onClick={onSkip}
              title="Skip fix"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export function ScorePanel({
  result,
  isLoading,
  progress,
  acceptedIds,
  skippedIds,
  staleIds,
  onAcceptFix,
  onSkipFix,
  onAcceptAll,
  onReanalyze,
  onClose,
}: ScorePanelProps) {
  const visibleFixes = result?.fixes.filter((f) => !skippedIds.has(f.id)) ?? [];
  const pendingFixes = visibleFixes.filter(
    (f) => !acceptedIds.has(f.id) && !staleIds.has(f.id),
  );
  const allDone = result && pendingFixes.length === 0 && visibleFixes.length > 0;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground flex cursor-pointer items-center gap-1.5 text-xs transition-colors"
          onClick={onClose}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        {result && (
          <button
            type="button"
            className="text-muted-foreground cursor-pointer text-xs hover:underline"
            onClick={onReanalyze}
            disabled={isLoading}
          >
            Re-analyze
          </button>
        )}
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 py-12">
          <div className="border-primary size-5 animate-spin rounded-full border-2 border-t-transparent" />
          <p className="text-muted-foreground text-sm">
            Analyzing resume… {progress}%
          </p>
          <div className="bg-muted h-1 w-48 overflow-hidden">
            <div
              className="bg-primary h-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Results */}
      {result && !isLoading && (
        <div className="flex-1 space-y-4 overflow-y-auto">
          {/* Score */}
          <ScoreRing score={result.score} />

          {/* Missing keywords */}
          {result.missingKeywords.length > 0 && (
            <div>
              <p className="text-muted-foreground mb-1.5 text-[10px] font-medium uppercase">
                Missing Keywords
              </p>
              <div className="flex flex-wrap gap-1">
                {result.missingKeywords.map((kw) => (
                  <Badge
                    key={kw}
                    variant="secondary"
                    className="text-[10px]"
                  >
                    {kw}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Fixes */}
          {visibleFixes.length > 0 && (
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-muted-foreground text-[10px] font-medium uppercase">
                  Suggested Fixes
                  <span className="text-muted-foreground/60 ml-1.5 normal-case">
                    {acceptedIds.size > 0
                      ? `${acceptedIds.size}/${result.fixes.length} applied`
                      : `${pendingFixes.length} available`}
                  </span>
                </p>
                {allDone && (
                  <Badge variant="secondary" className="text-[10px]">
                    All done ✓
                  </Badge>
                )}
              </div>

              <div className="space-y-2">
                {visibleFixes.map((fix) => (
                  <FixRow
                    key={fix.id}
                    fix={fix}
                    status={
                      acceptedIds.has(fix.id)
                        ? "accepted"
                        : skippedIds.has(fix.id)
                          ? "skipped"
                          : "pending"
                    }
                    isStale={staleIds.has(fix.id)}
                    onAccept={() => onAcceptFix(fix)}
                    onSkip={() => onSkipFix(fix.id)}
                  />
                ))}
              </div>

              {/* Apply All */}
              {pendingFixes.length > 1 && (
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-3 w-full text-xs"
                  onClick={onAcceptAll}
                >
                  Apply all remaining ({pendingFixes.length})
                </Button>
              )}
            </div>
          )}

          {/* No fixes */}
          {result.fixes.length === 0 && result.missingKeywords.length === 0 && (
            <p className="text-muted-foreground py-4 text-center text-sm">
              No keyword gaps found — your resume is well-matched!
            </p>
          )}
          {result.fixes.length === 0 && result.missingKeywords.length > 0 && (
            <p className="text-muted-foreground py-4 text-center text-xs">
              Try adding the missing keywords to your profile skills or editing resume sections directly.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
