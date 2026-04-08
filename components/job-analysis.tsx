"use client";

import { useEffect, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface JobAnalysis {
  overview: string;
  skills: string[];
  matchedSkills: string[];
  missingSkills: string[];
  matchScore: number;
  summary: string;
}

interface JobAnalysisProps {
  analysis: JobAnalysis | null;
  isAnalyzing: boolean;
  hasProfile: boolean;
  onReady?: () => void;
  onReanalyze?: () => void;
  onAddSkill?: (skill: string) => void;
  addedSkills?: Set<string>;
}

function ScoreRing({ score }: { score: number }) {
  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color =
    score >= 75
      ? "text-green-500"
      : score >= 50
        ? "text-yellow-500"
        : "text-red-400";

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="52" height="52" className="-rotate-90">
        <circle
          cx="26"
          cy="26"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
          className="text-muted/50"
        />
        <circle
          cx="26"
          cy="26"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={cn("transition-all duration-700 ease-out", color)}
        />
      </svg>
      <span className={cn("absolute text-[10px] font-bold", color)}>{score}%</span>
    </div>
  );
}

function SkeletonPulse({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={cn("bg-muted animate-pulse rounded", className)}
      style={style}
    />
  );
}

export function JobAnalysisPanel({
  analysis,
  isAnalyzing,
  hasProfile,
  onReady,
  onReanalyze,
  onAddSkill,
  addedSkills,
}: JobAnalysisProps) {
  const [collapsed, setCollapsed] = useState(false);
  const prevAnalysisRef = useRef<JobAnalysis | null>(null);

  // Auto-expand when new analysis arrives + notify parent
  useEffect(() => {
    if (analysis && analysis !== prevAnalysisRef.current) {
      setCollapsed(false);
      prevAnalysisRef.current = analysis;
      onReady?.();
    }
  }, [analysis, onReady]);

  if (!isAnalyzing && !analysis) return null;

  return (
    <div className="border-border bg-card animate-in fade-in slide-in-from-top-2 overflow-hidden border duration-300">
      {/* Header — always visible */}
      <div className="flex items-center justify-between px-4 py-2.5">
        {/* Left side: title + status — clickable to toggle */}
        <button
          type="button"
          onClick={() => !isAnalyzing && analysis && setCollapsed(!collapsed)}
          className={cn(
            "flex items-center gap-2",
            analysis && !isAnalyzing ? "cursor-pointer" : "cursor-default",
          )}
        >
          <span className="text-sm font-medium">Job Analysis</span>
          {isAnalyzing && (
            <div className="flex items-center gap-1.5">
              <div className="border-primary size-3 animate-spin rounded-full border-2 border-t-transparent" />
              <span className="text-muted-foreground text-xs">Analyzing...</span>
            </div>
          )}
          {analysis && hasProfile && !isAnalyzing && (
            <span
              className={cn(
                "text-xs font-semibold tabular-nums",
                analysis.matchScore >= 75
                  ? "text-green-600 dark:text-green-400"
                  : analysis.matchScore >= 50
                    ? "text-yellow-600 dark:text-yellow-400"
                    : "text-red-500 dark:text-red-400",
              )}
            >
              {analysis.matchScore}% match
            </span>
          )}
          {analysis && !isAnalyzing && (
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              className={cn(
                "text-muted-foreground transition-transform duration-200",
                collapsed ? "" : "rotate-180",
              )}
            >
              <path
                d="M4 6l4 4 4-4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </button>

        {/* Right side: re-analyze — separate from collapse toggle */}
        {analysis && !isAnalyzing && onReanalyze && (
          <button
            type="button"
            onClick={onReanalyze}
            className="text-muted-foreground hover:text-foreground cursor-pointer text-xs transition-colors"
          >
            Re-analyze
          </button>
        )}
      </div>

      {/* Content */}
      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-300 ease-in-out",
          collapsed ? "grid-rows-[0fr]" : "grid-rows-[1fr]",
        )}
      >
        <div className="overflow-hidden">
          <div className="space-y-4 px-4 pb-4">
            {/* Loading skeleton */}
            {isAnalyzing && !analysis && (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <SkeletonPulse className="h-3 w-3/4" />
                  <SkeletonPulse className="h-3 w-full" />
                  <SkeletonPulse className="h-3 w-1/2" />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <SkeletonPulse
                      key={i}
                      className="h-5 rounded-full"
                      style={{ width: `${60 + Math.random() * 40}px` } as React.CSSProperties}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Actual content */}
            {analysis && (
              <>
                {/* Overview */}
                <div>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {analysis.overview}
                  </p>
                </div>

                {/* Skills + Score side by side */}
                <div className="flex gap-4">
                  {/* Skills */}
                  <div className="min-w-0 flex-1">
                    <p className="text-muted-foreground mb-1.5 text-xs font-medium uppercase tracking-wide">
                      Required Skills
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {analysis.skills.map((skill) => {
                        const matched = analysis.matchedSkills.some(
                          (m) => m.toLowerCase() === skill.toLowerCase(),
                        );
                        const missing = analysis.missingSkills.some(
                          (m) => m.toLowerCase() === skill.toLowerCase(),
                        );
                        const justAdded = addedSkills?.has(skill.toLowerCase());

                        if (justAdded) {
                          return (
                            <Badge
                              key={skill}
                              variant="default"
                              className="bg-green-100 text-green-800 text-xs dark:bg-green-900/30 dark:text-green-300"
                            >
                              {skill} ✓
                            </Badge>
                          );
                        }

                        if (missing && onAddSkill) {
                          return (
                            <Badge
                              key={skill}
                              variant="outline"
                              className="cursor-pointer border-dashed text-xs opacity-60 transition-opacity hover:opacity-100"
                              onClick={() => onAddSkill(skill)}
                            >
                              + {skill}
                            </Badge>
                          );
                        }

                        return (
                          <Badge
                            key={skill}
                            variant={matched ? "default" : missing ? "outline" : "secondary"}
                            className={cn(
                              "text-xs",
                              matched && "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
                              missing && "border-dashed opacity-60",
                            )}
                          >
                            {skill}
                          </Badge>
                        );
                      })}
                    </div>
                    {hasProfile && (analysis.matchedSkills.length > 0 || analysis.missingSkills.length > 0) && (
                      <div className="text-muted-foreground mt-1.5 flex gap-3 text-xs">
                        <span className="flex items-center gap-1">
                          <span className="inline-block size-1.5 rounded-full bg-green-500" />
                          You have
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="border-muted-foreground inline-block size-1.5 rounded-full border border-dashed" />
                          {onAddSkill ? "Click to add" : "Missing"}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Score ring */}
                  {hasProfile && analysis.matchScore > 0 && (
                    <div className="flex shrink-0 flex-col items-center gap-1">
                      <ScoreRing score={analysis.matchScore} />
                      <p className="text-muted-foreground text-[10px]">Match</p>
                    </div>
                  )}
                </div>

                {/* Fit summary */}
                {analysis.summary && (
                  <p className="text-muted-foreground border-t pt-3 text-sm italic leading-relaxed">
                    {analysis.summary}
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
