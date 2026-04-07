"use client";

import { toast } from "sonner";
import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";

import { JobAnalysisPanel, type JobAnalysis } from "@/components/job-analysis";
import { ResumeAnalyzerDialog } from "@/components/resume/resume-analyzer-dialog";
import ResumePreview from "@/components/resume/resume-preview";
import { TemplateSettingsDialog } from "@/components/resume/template-settings-dialog";
import SignInButton from "@/components/sign-in-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { TrackApplicationDialog } from "@/components/track-application-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserMenu } from "@/components/user-menu";
import { useUndoHistory } from "@/hooks/use-undo-history";
import { useUser } from "@/hooks/use-user";
import { DEFAULT_MODEL_ID, MODELS } from "@/lib/models";
import { EMPTY_PROFILE, isProfileEmpty, migrateSkills, type UserProfile } from "@/lib/profile";
import { RESUME_CSS, RESUME_PRINT_CSS } from "@/lib/resume/resume-styles";
import {
  DEFAULT_SETTINGS,
  DEFAULT_TEMPLATE,
  type TemplateSettings,
} from "@/lib/resume/templates";
import { cn } from "@/lib/utils";

const TextEditor = dynamic(() => import("@/components/text-editor"), {
  ssr: false,
});

export default function Page() {
  const { user, loading: authLoading } = useUser();
  const router = useRouter();
  const jobDescriptionRef = useRef("");
  const resumeRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const {
    value: placeholders,
    push: pushPlaceholders,
    set: setPlaceholders,
  } = useUndoHistory<Record<string, string> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [targetPages, setTargetPages] = useState(1);
  const [hasJobDescription, setHasJobDescription] = useState(false);
  const editorResetRef = useRef<(() => void) | null>(null);
  const editorSetContentRef = useRef<((text: string) => void) | null>(null);
  const [isExtractingUrl, setIsExtractingUrl] = useState(false);
  const [trackDialogOpen, setTrackDialogOpen] = useState(false);
  const [existingCities, setExistingCities] = useState<string[]>([]);
  const [existingPlatforms, setExistingPlatforms] = useState<string[]>([]);
  const [customPrompt, setCustomPrompt] = useState("");
  const [jobAnalysis, setJobAnalysis] = useState<JobAnalysis | null>(() => {
    try {
      const cached = sessionStorage.getItem("job_analysis_cache");
      if (cached) {
        const { analysis } = JSON.parse(cached);
        return analysis ?? null;
      }
    } catch { /* ignore */ }
    return null;
  });
  const [isAnalyzingJob, setIsAnalyzingJob] = useState(false);
  const [jobDescCollapsed, setJobDescCollapsed] = useState(false);
  const analysisJobRef = useRef(
    (() => {
      try {
        const cached = sessionStorage.getItem("job_analysis_cache");
        if (cached) {
          const { jobText } = JSON.parse(cached);
          return jobText ?? "";
        }
      } catch { /* ignore */ }
      return "";
    })(),
  );
  const analyzeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [resumeTitle, setResumeTitle] = useState("Resume");

  const MAX_ATTEMPTS = 5;
  const [usageCount, setUsageCount] = useState(0);
  const [usageLoaded, setUsageLoaded] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [cancelAt, setCancelAt] = useState<string | null>(null);

  // Model selection
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL_ID);

  // Template settings
  const [templateSettings, setTemplateSettings] =
    useState<TemplateSettings>(DEFAULT_SETTINGS);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const settingsSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // User profile
  const [userProfile, setUserProfile] = useState<UserProfile>(EMPTY_PROFILE);

  // Load existing cities and platforms for track dialog autocomplete
  useEffect(() => {
    if (!user) return;
    fetch("/api/applications")
      .then((res) => res.json())
      .then((apps: { notes?: string; platform?: string }[]) => {
        const cities = new Set<string>();
        const platforms = new Set<string>();
        for (const app of apps) {
          if (app.notes?.trim()) cities.add(app.notes.trim());
          if (app.platform?.trim()) platforms.add(app.platform.trim());
        }
        setExistingCities([...cities].sort());
        setExistingPlatforms([...platforms].sort());
      })
      .catch(() => {});
  }, [user]);

  // Restore cached resume state from sessionStorage
  useEffect(() => {
    try {
      const cached = sessionStorage.getItem("resume_cache");
      if (cached) {
        const { placeholders: p, title } = JSON.parse(cached);
        if (p) setPlaceholders(p);
        if (title) setResumeTitle(title);
      }
    } catch {
      // ignore parse errors
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cache resume state to sessionStorage on change
  useEffect(() => {
    if (placeholders) {
      sessionStorage.setItem(
        "resume_cache",
        JSON.stringify({ placeholders, title: resumeTitle }),
      );
    }
  }, [placeholders, resumeTitle]);

  // Cache job analysis to sessionStorage so it survives navigation
  useEffect(() => {
    if (jobAnalysis && analysisJobRef.current) {
      sessionStorage.setItem(
        "job_analysis_cache",
        JSON.stringify({ analysis: jobAnalysis, jobText: analysisJobRef.current }),
      );
    }
  }, [jobAnalysis]);

  // Load template settings when user changes
  useEffect(() => {
    fetch("/api/template-settings")
      .then((res) => res.json())
      .then((data: TemplateSettings) => setTemplateSettings(data))
      .catch(() => {});
  }, [user]);

  // Load user profile when user changes — redirect to /profile if empty
  useEffect(() => {
    if (!user) return;
    fetch("/api/profile")
      .then((res) => res.json())
      .then((data: UserProfile | null) => {
        if (data) {
          setUserProfile({
            ...data,
            skills: migrateSkills(data.skills),
          });
        }
        if (!data || isProfileEmpty({ ...EMPTY_PROFILE, ...data, skills: migrateSkills(data?.skills) })) {
          router.push("/profile");
        }
      })
      .catch(() => {});
  }, [user, router]);

  // Fetch usage count from DB when user changes
  useEffect(() => {
    if (!user) return;
    setUsageLoaded(false);
    fetch("/api/usage")
      .then((res) => res.json())
      .then(
        (data: {
          count: number;
          subscribed?: boolean;
          cancelAt?: string | null;
        }) => {
          setUsageCount(data.count);
          setIsSubscribed(!!data.subscribed);
          setCancelAt(data.cancelAt ?? null);
        },
      )
      .catch(() => {})
      .finally(() => setUsageLoaded(true));
  }, [user]);

  const incrementUsage = useCallback(async () => {
    try {
      const res = await fetch("/api/usage", { method: "POST" });
      const data = (await res.json()) as { count: number };
      setUsageCount(data.count);
    } catch {
      // Silently fail — count was already enforced server-side
    }
  }, []);

  const attemptsLeft = MAX_ATTEMPTS - usageCount;

  const handleUpgrade = useCallback(async () => {
    setIsUpgrading(true);
    try {
      const res = await fetch("/api/stripe/checkout", { method: "POST" });
      const data = (await res.json()) as { url?: string };
      if (data.url) window.location.href = data.url;
    } catch {
      setError("Failed to start checkout");
    } finally {
      setIsUpgrading(false);
    }
  }, []);

  // ── Auto-analyze job description ──
  const analyzeJob = useCallback(
    async (jobText: string) => {
      // Skip if same job already analyzed or empty
      if (!jobText.trim() || jobText.trim() === analysisJobRef.current) return;
      analysisJobRef.current = jobText.trim();
      setIsAnalyzingJob(true);
      setJobAnalysis(null);
      try {
        const res = await fetch("/api/analyze-job", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jobDescription: jobText,
            userProfile: isProfileEmpty(userProfile) ? undefined : userProfile,
            model: selectedModel,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setJobAnalysis(data);
        }
      } catch {
        // silently fail — analysis is non-critical
      } finally {
        setIsAnalyzingJob(false);
      }
    },
    [userProfile, selectedModel],
  );

  // ── LinkedIn URL auto-extract ──
  const handleUrlDetected = useCallback(
    async (url: string) => {
      // Cancel any pending debounced analysis — we'll trigger it after extraction
      if (analyzeTimerRef.current) {
        clearTimeout(analyzeTimerRef.current);
        analyzeTimerRef.current = null;
      }
      setIsExtractingUrl(true);
      try {
        const res = await fetch("/api/extract-job", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          toast.error("Could not extract job", {
            description:
              data.error || "Failed to fetch job description from URL",
          });
          return;
        }
        const data = await res.json();
        if (data.fullText) {
          editorSetContentRef.current?.(data.fullText);
          toast.success("Job description extracted", {
            description: data.title
              ? `${data.title}${data.company ? ` at ${data.company}` : ""}`
              : "LinkedIn job loaded",
          });
          // Auto-trigger analysis on extracted content
          analyzeJob(data.fullText);
        }
      } catch {
        toast.error("Failed to extract job description");
      } finally {
        setIsExtractingUrl(false);
      }
    },
    [analyzeJob],
  );

  const handleTailor = useCallback(
    async (promptOverride?: string) => {
      const jobDescription = jobDescriptionRef.current;

      if (!jobDescription.trim()) {
        setError("Please paste a job description first");
        return;
      }

      setError(null);
      setIsLoading(true);
      setIsStreaming(false);
      setPlaceholders(null);

      try {
        const resumeTexts: string[] = [];

        // Tailor with AI (streamed)
        const tailorRes = await fetch("/api/tailor", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jobDescription,
            resumeTexts,
            placeholders: [...DEFAULT_TEMPLATE.placeholders, "_COMPANY_NAME"],
            targetPages,
            userName:
              user?.user_metadata?.full_name || user?.user_metadata?.name,
            userEmail: user?.email,
            customPrompt: (promptOverride ?? customPrompt) || undefined,
            templateSettings,
            model: selectedModel,
            userProfile: isProfileEmpty(userProfile) ? undefined : userProfile,
          }),
        });

        if (!tailorRes.ok) {
          throw new Error("Failed to tailor resume");
        }

        setIsStreaming(true);
        setIsLoading(false);
        setPlaceholders({});

        const reader = tailorRes.body!.getReader();
        const decoder = new TextDecoder();
        let accumulated = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          accumulated += decoder.decode(value, { stream: true });

          // Try parsing the accumulated JSON so far
          try {
            const parsed = JSON.parse(accumulated) as Record<string, string>;
            delete parsed._COMPANY_NAME;
            setPlaceholders(parsed);
          } catch {
            // JSON is still incomplete — try to extract partial key-value pairs
            // by closing the incomplete JSON with a }
            try {
              // Remove any trailing incomplete string value (unclosed quote)
              let fixup = accumulated.trimEnd();
              // If ends with an unfinished string value, close it
              if (fixup.endsWith(",")) {
                fixup = fixup.slice(0, -1);
              }
              // Try closing the object
              const parsed = JSON.parse(fixup + "}") as Record<string, string>;
              delete parsed._COMPANY_NAME;
              setPlaceholders(parsed);
            } catch {
              // Still not parseable — wait for more data
            }
          }
        }

        // Final parse with the complete data
        const finalPlaceholders = JSON.parse(accumulated) as Record<
          string,
          string
        >;
        pushPlaceholders(finalPlaceholders);
        setIsStreaming(false);
        incrementUsage();

        // Set resume title using AI-extracted company name
        const companyName = finalPlaceholders._COMPANY_NAME;
        if (companyName && companyName !== "[Company Name]") {
          setResumeTitle(`Resume — ${companyName}`);
        } else {
          setResumeTitle("Resume — [Company Name]");
        }
        // Remove the hidden field so it doesn't appear in the resume
        delete finalPlaceholders._COMPANY_NAME;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
        setIsStreaming(false);
      } finally {
        setIsLoading(false);
      }
    },
    [
      targetPages,
      incrementUsage,
      user,
      customPrompt,
      templateSettings,
      selectedModel,
      userProfile,
      pushPlaceholders,
      setPlaceholders,
    ],
  );

  const handleDownloadPdf = useCallback(() => {
    const element = resumeRef.current;
    if (!element) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const title = resumeTitle || "Resume";

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title}</title>
          <style>
            *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
            ${RESUME_CSS}
            ${RESUME_PRINT_CSS}
          </style>
        </head>
        <body class="resume-page">${element.innerHTML}</body>
      </html>
    `);
    printWindow.document.close();

    // Wait for content to render, then trigger print
    printWindow.onload = () => {
      printWindow.print();
      printWindow.close();
    };
  }, [resumeTitle]);

  return (
    <>
      <div className="container mx-auto flex flex-1 flex-col px-4 pt-6 pb-12">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between lg:mb-8">
          <h1 className="font-mono text-lg font-bold sm:text-xl">
            Resume Maker
          </h1>
          <div className="flex items-center gap-2">
            {placeholders && (
              <Button
                size="sm"
                variant="ghost"
                className="text-muted-foreground text-xs"
                onClick={() => {
                  setPlaceholders(null);
                  setResumeTitle("Resume");
                  setHasJobDescription(false);
                  jobDescriptionRef.current = "";
                  editorResetRef.current?.();
                  sessionStorage.removeItem("resume_cache");
                }}
              >
                Clear
              </Button>
            )}
            <ModelSelector
              selectedModelId={selectedModel}
              onModelChange={setSelectedModel}
            />
            {user && (
              <UserMenu
                user={user}
                usageCount={usageCount}
                maxAttempts={MAX_ATTEMPTS}
                isSubscribed={isSubscribed}
                cancelAt={cancelAt}
              />
            )}
            <ThemeToggle />
          </div>
        </div>

        <div className="flex flex-1 flex-col items-start gap-8 lg:flex-row">
          {/* Left panel */}
          <div className="flex w-full flex-col gap-6 lg:gap-8">
            <div className="h-fit w-full space-y-3">
              {/* Job Description — collapsible */}
              <div>
                <button
                  type="button"
                  onClick={() =>
                    hasJobDescription && setJobDescCollapsed(!jobDescCollapsed)
                  }
                  className={cn(
                    "mb-2 flex w-full items-center justify-between",
                    hasJobDescription ? "cursor-pointer" : "cursor-default",
                  )}
                >
                  <h2 className="font-mono">Job Description / LinkedIn URL</h2>
                  <div className="flex items-center gap-2">
                    {hasJobDescription && (
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation();
                          editorResetRef.current?.();
                          setJobDescCollapsed(false);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.stopPropagation();
                            editorResetRef.current?.();
                            setJobDescCollapsed(false);
                          }
                        }}
                        className="text-muted-foreground hover:text-destructive cursor-pointer text-xs transition-colors"
                      >
                        Reset
                      </span>
                    )}
                    {hasJobDescription && (
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        className={cn(
                          "text-muted-foreground transition-transform duration-200",
                          jobDescCollapsed ? "" : "rotate-180",
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
                  </div>
                </button>
                <div
                  className={cn(
                    "grid transition-[grid-template-rows] duration-300 ease-in-out",
                    jobDescCollapsed ? "grid-rows-[0fr]" : "grid-rows-[1fr]",
                  )}
                >
                  <div className="overflow-hidden">
                    <TextEditor
                      onTextChange={(text) => {
                        jobDescriptionRef.current = text;
                        // Debounced auto-analysis when substantial text is pasted
                        // Skip if it looks like a URL or we're currently extracting from a URL
                        const isUrl = /^https?:\/\/\S+$/i.test(text.trim());
                        if (
                          text.trim().length > 80 &&
                          !isExtractingUrl &&
                          !isUrl
                        ) {
                          if (analyzeTimerRef.current)
                            clearTimeout(analyzeTimerRef.current);
                          analyzeTimerRef.current = setTimeout(
                            () => analyzeJob(text),
                            1500,
                          );
                        }
                      }}
                      onHasContentChange={(has) => {
                        setHasJobDescription(has);
                        if (!has) {
                          setJobAnalysis(null);
                          setIsAnalyzingJob(false);
                          analysisJobRef.current = "";
                          setJobDescCollapsed(false);
                          try { sessionStorage.removeItem("job_analysis_cache"); } catch { /* ignore */ }
                        }
                      }}
                      onResetRef={editorResetRef}
                      onSetContentRef={editorSetContentRef}
                      onUrlDetected={handleUrlDetected}
                    />
                  </div>
                </div>
                {isExtractingUrl && (
                  <div className="text-muted-foreground mt-2 flex items-center gap-2 text-xs">
                    <div className="border-primary size-3 animate-spin rounded-full border-2 border-t-transparent" />
                    Extracting job from LinkedIn...
                  </div>
                )}
              </div>

              {/* Job Analysis — inline panel */}
              {(jobAnalysis || isAnalyzingJob) && (
                <JobAnalysisPanel
                  analysis={jobAnalysis}
                  isAnalyzing={isAnalyzingJob}
                  hasProfile={!isProfileEmpty(userProfile)}
                  onReady={() => {
                    // Don't auto-collapse — let user control it
                  }}
                  onReanalyze={() => {
                    analysisJobRef.current = "";
                    analyzeJob(jobDescriptionRef.current);
                  }}
                />
              )}
            </div>

            {error && <p className="text-destructive text-sm">{error}</p>}

            {!authLoading && !user ? (
              <SignInButton />
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                {/* Primary action */}
                {!isSubscribed && attemptsLeft <= 0 ? (
                  <Button
                    size="lg"
                    className="flex-1"
                    onClick={handleUpgrade}
                    disabled={isUpgrading}
                  >
                    {isUpgrading ? "Redirecting..." : "Upgrade to Pro — $5/mo"}
                  </Button>
                ) : (
                  <Button
                    size="lg"
                    className="flex-1"
                    onClick={() => handleTailor()}
                    disabled={isLoading || authLoading || !usageLoaded}
                  >
                    {isLoading ? "Tailoring..." : "Tailor Resume"}
                  </Button>
                )}

                {/* Resume controls */}
                <TemplateSettingsDialog
                  settings={templateSettings}
                  onSave={(newSettings) => {
                    // Apply immediately to UI
                    setTemplateSettings(newSettings);
                    // Debounce the DB save
                    if (settingsSaveTimer.current)
                      clearTimeout(settingsSaveTimer.current);
                    settingsSaveTimer.current = setTimeout(async () => {
                      try {
                        await fetch("/api/template-settings", {
                          method: "PUT",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify(newSettings),
                        });
                      } catch {
                        // silently fail
                      }
                    }, 500);
                  }}
                  isSaving={isSavingSettings}
                  disabled={!user}
                />

                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground text-xs whitespace-nowrap">
                    Pages
                  </span>
                  <div className="border-input flex items-center border">
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-foreground hover:bg-muted h-10 w-8 cursor-pointer text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                      onClick={() => setTargetPages((p) => Math.max(1, p - 1))}
                      disabled={targetPages <= 1}
                      aria-label="Decrease pages"
                    >
                      −
                    </button>
                    <span className="w-6 text-center text-sm font-medium tabular-nums">
                      {targetPages}
                    </span>
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-foreground hover:bg-muted h-10 w-8 cursor-pointer text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                      onClick={() => setTargetPages((p) => Math.min(2, p + 1))}
                      disabled={targetPages >= 2}
                      aria-label="Increase pages"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* Right panel */}
          <div className="w-full">
            <h2 className="mb-2 font-mono">Resume</h2>
            <>
              {placeholders && (
                <div className="mb-4 flex items-center gap-2">
                  <input
                    type="text"
                    value={resumeTitle}
                    onChange={(e) => setResumeTitle(e.target.value)}
                    className="focus:border-foreground/20 flex-1 bg-transparent font-mono text-sm outline-none focus:border-b"
                    placeholder="Resume title..."
                  />
                  {user && (
                    <>
                      <ResumeAnalyzerDialog
                        placeholders={placeholders}
                        jobDescription={jobDescriptionRef.current}
                        disabled={!user}
                        label="Score"
                        onAcceptSuggestion={(section, newText) => {
                          if (placeholders) {
                            pushPlaceholders({
                              ...placeholders,
                              [section]: newText,
                            });
                          }
                        }}
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        className="shrink-0 text-xs"
                        onClick={() => setTrackDialogOpen(true)}
                      >
                        Track Application
                      </Button>
                      <TrackApplicationDialog
                        open={trackDialogOpen}
                        onOpenChange={setTrackDialogOpen}
                        position={
                          placeholders.JOB_TITLE ||
                          resumeTitle.split("\u2014")[0]?.trim() ||
                          ""
                        }
                        company={resumeTitle.split("\u2014")[1]?.trim() || ""}
                        resumeData={placeholders}
                        cities={existingCities}
                        platforms={existingPlatforms}
                        onTrack={async (data) => {
                          await fetch("/api/applications", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(data),
                          });
                          // Update autocomplete lists with new values
                          if (
                            data.notes &&
                            !existingCities.includes(data.notes)
                          ) {
                            setExistingCities((prev) =>
                              [...prev, data.notes].sort(),
                            );
                          }
                          if (
                            data.platform &&
                            !existingPlatforms.includes(data.platform)
                          ) {
                            setExistingPlatforms((prev) =>
                              [...prev, data.platform].sort(),
                            );
                          }
                          toast.success("Application tracked", {
                            description: `${data.position}${data.company ? ` at ${data.company}` : ""}`,
                            action: {
                              label: "View All",
                              onClick: () => router.push("/applications"),
                            },
                          });
                        }}
                      />
                    </>
                  )}
                </div>
              )}
              <ResumePreview
                ref={resumeRef}
                placeholders={placeholders}
                isLoading={isLoading}
                isStreaming={isStreaming}
                onDownloadPdf={handleDownloadPdf}
                jobDescription={jobDescriptionRef.current}
                templateSettings={templateSettings}
                onPlaceholderChange={(key, value) =>
                  pushPlaceholders(
                    placeholders ? { ...placeholders, [key]: value } : null,
                  )
                }
                onBatchPlaceholderChange={(updates) =>
                  pushPlaceholders(
                    placeholders ? { ...placeholders, ...updates } : null,
                  )
                }
              />
            </>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Model Selector ────────────────────────────────────────────────────

function ModelSelector({
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
