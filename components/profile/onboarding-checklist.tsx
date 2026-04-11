"use client";

import { useEffect, useRef } from "react";

import Link from "next/link";

import {
  CheckmarkCircleIcon,
  CircleIcon,
  ArrowRightIcon,
  DocumentAttachmentIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { Button } from "@/components/ui/button";
import {
  getOnboardingSteps,
  isProfileEmpty,
  type UserProfile,
} from "@/lib/profile";

interface OnboardingChecklistProps {
  draft: UserProfile;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onImportClick: () => void;
  onSkip: () => void;
  onComplete: () => void;
}

export function OnboardingChecklist({
  draft,
  activeTab,
  onTabChange,
  onImportClick,
  onSkip,
  onComplete,
}: OnboardingChecklistProps) {
  const steps = getOnboardingSteps(draft);
  const dataSteps = steps.filter((s) => s.targetTab !== null);
  const allDataStepsDone = dataSteps.every((s) => s.completed);
  const prevCompletedRef = useRef<Set<string>>(
    new Set(steps.filter((s) => s.completed).map((s) => s.id)),
  );

  // Auto-switch to next tab when a SINGLE step completes (user just filled
  // in one section). When multiple steps complete at once (bulk import), we
  // stay on the current page — navigating away mid-import is disruptive.
  useEffect(() => {
    const prevCompleted = prevCompletedRef.current;
    const nowCompleted = new Set(
      steps.filter((s) => s.completed).map((s) => s.id),
    );

    // Count how many steps just became completed
    let newlyCompleted = 0;
    for (const id of nowCompleted) {
      if (!prevCompleted.has(id)) {
        newlyCompleted++;
      }
    }

    prevCompletedRef.current = nowCompleted;

    if (newlyCompleted === 0) return;

    // Check if all data steps are now done
    if (dataSteps.every((s) => s.completed)) {
      onComplete();
      return;
    }

    // Only auto-navigate when a single step completed (manual editing),
    // not when many steps complete at once (resume import).
    if (newlyCompleted === 1) {
      const nextStep = dataSteps.find((s) => !s.completed);
      if (nextStep?.targetTab && nextStep.targetTab !== activeTab) {
        onTabChange(nextStep.targetTab);
      }
    }
  }, [steps, dataSteps, activeTab, onTabChange, onComplete]);

  const profileEmpty = isProfileEmpty(draft);

  return (
    <div className="border-border bg-card mb-6 border p-4">
      <h3 className="mb-1 text-sm font-semibold">
        {allDataStepsDone
          ? "You're all set!"
          : "Welcome! Let's set up your profile"}
      </h3>

      {allDataStepsDone ? (
        <div className="space-y-3">
          <p className="text-muted-foreground text-xs">
            Your profile is ready. Go generate your first tailored resume.
          </p>
          <div className="flex items-center gap-3">
            <Button size="sm" asChild>
              <Link href="/">
                Generate Resume
                <HugeiconsIcon
                  icon={ArrowRightIcon}
                  className="ml-1 size-3.5"
                />
              </Link>
            </Button>
            <button
              type="button"
              onClick={onSkip}
              className="text-muted-foreground hover:text-foreground cursor-pointer text-xs transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Import shortcut — always available to merge with existing data */}
          <div className="mb-4">
            {profileEmpty && (
              <p className="text-muted-foreground mb-2 text-xs">
                Want to speed things up?
              </p>
            )}
            <button
              type="button"
              onClick={onImportClick}
              className="border-border hover:bg-accent flex w-full cursor-pointer items-center gap-2 border p-2.5 text-left text-xs transition-colors"
            >
              <HugeiconsIcon
                icon={DocumentAttachmentIcon}
                className="text-muted-foreground size-4 shrink-0"
              />
              <div>
                <span className="font-medium">
                  Import from your resume PDFs
                </span>
                <span className="text-muted-foreground ml-1">
                  — upload up to 10 and we'll merge with your profile
                </span>
              </div>
            </button>
          </div>

          {/* Steps */}
          <div className="space-y-1.5">
            {steps.map((step, i) => {
              const isActive =
                !step.completed &&
                (i === 0 || steps[i - 1].completed || steps[i - 1].targetTab === null);
              const isGenerateStep = step.targetTab === null;
              const canGenerate = isGenerateStep && allDataStepsDone;
              const isProjectStep = step.id === "projects";

              return (
                <div key={step.id}>
                  <button
                    type="button"
                    onClick={() => {
                      if (step.completed) return;
                      if (isGenerateStep) return;
                      if (step.targetTab) onTabChange(step.targetTab);
                    }}
                    disabled={step.completed || (isGenerateStep && !canGenerate)}
                    className={`flex w-full items-center gap-2 px-1 py-1 text-left text-xs transition-colors ${
                      step.completed
                        ? "text-muted-foreground"
                        : isActive
                          ? "text-foreground cursor-pointer font-medium"
                          : "text-muted-foreground/60"
                    }`}
                  >
                    <HugeiconsIcon
                      icon={
                        step.completed ? CheckmarkCircleIcon : CircleIcon
                      }
                      className={`size-3.5 shrink-0 ${
                        step.completed
                          ? "text-green-600 dark:text-green-400"
                          : isActive
                            ? "text-foreground"
                            : "text-muted-foreground/40"
                      }`}
                    />
                    <span className={step.completed ? "line-through" : ""}>
                      {i + 1}. {step.label}
                    </span>
                    {isActive && !isGenerateStep && (
                      <HugeiconsIcon
                        icon={ArrowRightIcon}
                        className="text-muted-foreground size-3"
                      />
                    )}
                  </button>
                  {isProjectStep && isActive && (
                    <p className="text-muted-foreground mt-1 mb-1 ml-6 text-[11px]">
                      This is the most important step — project highlights
                      become your resume bullet points.
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Skip */}
          <div className="mt-3 border-t pt-3">
            <button
              type="button"
              onClick={onSkip}
              className="text-muted-foreground hover:text-foreground cursor-pointer text-xs transition-colors"
            >
              Skip guide
            </button>
          </div>
        </>
      )}
    </div>
  );
}
