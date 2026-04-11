"use client";

import { toast } from "sonner";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";

import { JobAnalysisPanel, type JobAnalysis } from "@/components/job-analysis";
import { ScorePanel } from "@/components/resume/score-panel";
import ResumePreview from "@/components/resume/resume-preview";
import type { KeywordFix, ScoreResult } from "@/lib/score-types";
import { TemplateSettingsDialog } from "@/components/resume/template-settings-dialog";
import SignInButton from "@/components/sign-in-button";
import { AppHeader } from "@/components/app-header";
import { ModelSelector } from "@/components/model-selector";
import { TrackApplicationDialog } from "@/components/track-application-dialog";
import { Button } from "@/components/ui/button";
import { useUndoHistory } from "@/hooks/use-undo-history";
import { useUser } from "@/hooks/use-user";
import { DEFAULT_MODEL_ID, MODELS } from "@/lib/models";
import { categorizeSkills, EMPTY_PROFILE, flattenSkills, isProfileEmpty, migrateContactFields, migrateSkills, type UserProfile } from "@/lib/profile";
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

/** Check a fetch response for 429 rate-limit and show a toast. Returns true if rate-limited. */
async function handleRateLimit(res: Response): Promise<boolean> {
  if (res.status === 429) {
    const data = await res.json().catch(() => ({}));
    const seconds = data.retryAfter ?? res.headers.get("Retry-After") ?? "a few";
    toast.error(`Too many requests — try again in ${seconds}s`);
    return true;
  }
  return false;
}

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

  const [maxAttempts, setMaxAttempts] = useState(5);
  const [usageCount, setUsageCount] = useState(0);
  const [usageLoaded, setUsageLoaded] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [cancelAt, setCancelAt] = useState<string | null>(null);
  const [resetsAt, setResetsAt] = useState<string | undefined>(undefined);

  // Score panel state
  const [scoreResult, setScoreResult] = useState<ScoreResult | null>(() => {
    try {
      const cached = sessionStorage.getItem("resume_score_cache");
      if (cached) {
        const { result } = JSON.parse(cached);
        return result ?? null;
      }
    } catch { /* ignore */ }
    return null;
  });
  const [showScorePanel, setShowScorePanel] = useState(false);
  const [isScoring, setIsScoring] = useState(false);
  const [scoreProgress, setScoreProgress] = useState(0);
  const scoreProgressRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [acceptedFixIds, setAcceptedFixIds] = useState<Set<string>>(new Set());
  const [skippedFixIds, setSkippedFixIds] = useState<Set<string>>(new Set());
  const [staleFixIds, setStaleFixIds] = useState<Set<string>>(new Set());

  // Model selection — persisted in localStorage so it survives navigation/refresh
  const [selectedModel, setSelectedModelState] = useState(DEFAULT_MODEL_ID);

  // Load persisted model on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem("selected_model");
    if (stored && MODELS.some((m) => m.id === stored)) {
      setSelectedModelState(stored);
    }
  }, []);

  const setSelectedModel = useCallback((modelId: string) => {
    setSelectedModelState(modelId);
    if (typeof window !== "undefined") {
      localStorage.setItem("selected_model", modelId);
    }
  }, []);

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
            ...EMPTY_PROFILE,
            ...data,
            skills: migrateSkills(data.skills),
            contact_fields: migrateContactFields(data),
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
          max: number;
          subscribed?: boolean;
          cancelAt?: string | null;
          resetsAt?: string;
        }) => {
          setUsageCount(data.count);
          setMaxAttempts(data.max);
          setIsSubscribed(!!data.subscribed);
          setCancelAt(data.cancelAt ?? null);
          setResetsAt(data.resetsAt);
        },
      )
      .catch(() => {})
      .finally(() => setUsageLoaded(true));
  }, [user]);

  // Handle referral code from URL (?ref=CODE) — store in localStorage for OAuth flow
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const refCode = params.get("ref");
      if (refCode) {
        localStorage.setItem("referral_code", refCode);
        // Clean up URL
        const url = new URL(window.location.href);
        url.searchParams.delete("ref");
        window.history.replaceState({}, "", url.toString());
      }
    } catch {
      // ignore
    }
  }, []);

  // Process referral after authentication
  useEffect(() => {
    if (!user) return;
    try {
      const refCode = localStorage.getItem("referral_code");
      if (!refCode) return;
      // Only process for users with 0 usage (new users)
      if (usageLoaded && usageCount === 0) {
        fetch("/api/referral", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: refCode }),
        })
          .then(() => localStorage.removeItem("referral_code"))
          .catch(() => {});
      }
    } catch {
      // ignore
    }
  }, [user, usageLoaded, usageCount]);

  const incrementUsage = useCallback(async () => {
    try {
      const res = await fetch("/api/usage", { method: "POST" });
      const data = (await res.json()) as { count: number };
      setUsageCount(data.count);
    } catch {
      // Silently fail — count was already enforced server-side
    }
  }, []);

  const attemptsLeft = maxAttempts - usageCount;

  // ── Score panel handlers ──
  const stopScoreProgress = useCallback(() => {
    if (scoreProgressRef.current) {
      clearInterval(scoreProgressRef.current);
      scoreProgressRef.current = null;
    }
  }, []);

  const handleScore = useCallback(async () => {
    if (!placeholders || !jobDescriptionRef.current) return;

    // Need job analysis keywords to anchor scoring
    if (!jobAnalysis?.skills?.length) {
      toast.error("Wait for job analysis to complete first");
      return;
    }

    if (scoreResult && !isScoring) {
      // Already have results — just show the panel
      setShowScorePanel(true);
      return;
    }

    setIsScoring(true);
    setShowScorePanel(true);
    setScoreResult(null);
    setAcceptedFixIds(new Set());
    setSkippedFixIds(new Set());
    setStaleFixIds(new Set());

    // Fake progress
    let p = 0;
    setScoreProgress(0);
    stopScoreProgress();
    scoreProgressRef.current = setInterval(() => {
      p += p < 50 ? 6 : p < 80 ? 3 : 0.5;
      p = Math.min(p, 95);
      setScoreProgress(Math.round(p));
    }, 200);

    try {
      const res = await fetch("/api/analyze-resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          placeholders,
          jobDescription: jobDescriptionRef.current,
          requiredKeywords: jobAnalysis.skills,
          model: selectedModel,
        }),
      });

      if (await handleRateLimit(res)) return;
      if (!res.ok) throw new Error("Analysis failed");

      const data = (await res.json()) as ScoreResult;
      setScoreProgress(100);
      setScoreResult(data);

      // Cache in sessionStorage
      sessionStorage.setItem(
        "resume_score_cache",
        JSON.stringify({ result: data }),
      );
    } catch {
      toast.error("Failed to analyze resume");
      setShowScorePanel(false);
    } finally {
      stopScoreProgress();
      setIsScoring(false);
    }
  }, [placeholders, scoreResult, isScoring, stopScoreProgress, jobAnalysis, selectedModel]);

  const handleReanalyze = useCallback(() => {
    // Force re-fetch by clearing cached result
    setScoreResult(null);
    sessionStorage.removeItem("resume_score_cache");
    if (!placeholders || !jobDescriptionRef.current || !jobAnalysis?.skills?.length) return;

    setIsScoring(true);
    setAcceptedFixIds(new Set());
    setSkippedFixIds(new Set());
    setStaleFixIds(new Set());

    let p = 0;
    setScoreProgress(0);
    stopScoreProgress();
    scoreProgressRef.current = setInterval(() => {
      p += p < 50 ? 6 : p < 80 ? 3 : 0.5;
      p = Math.min(p, 95);
      setScoreProgress(Math.round(p));
    }, 200);

    fetch("/api/analyze-resume", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        placeholders,
        jobDescription: jobDescriptionRef.current,
        requiredKeywords: jobAnalysis.skills,
        model: selectedModel,
      }),
    })
      .then(async (res) => {
        if (await handleRateLimit(res)) return null;
        if (!res.ok) throw new Error("Analysis failed");
        return res.json();
      })
      .then((data: ScoreResult | null) => {
        if (!data) return;
        setScoreProgress(100);
        setScoreResult(data);
        sessionStorage.setItem(
          "resume_score_cache",
          JSON.stringify({ result: data }),
        );
      })
      .catch(() => {
        toast.error("Failed to analyze resume");
      })
      .finally(() => {
        stopScoreProgress();
        setIsScoring(false);
      });
  }, [placeholders, stopScoreProgress, jobAnalysis, selectedModel]);

  const handleAcceptFix = useCallback(
    (fix: KeywordFix) => {
      if (!placeholders) return;

      const sectionText = placeholders[fix.section] || "";

      // Append-style fix: just append the keyword to the section
      if (fix.append) {
        const trimmed = sectionText.trimEnd().replace(/[,.;]\s*$/, "");
        const updated = trimmed
          ? `${trimmed}, ${fix.append}`
          : fix.append;
        pushPlaceholders({ ...placeholders, [fix.section]: updated });
        setAcceptedFixIds((prev) => new Set(prev).add(fix.id));
        return;
      }

      if (!sectionText) return;

      // Verify snippet still exists
      if (!sectionText.includes(fix.currentSnippet)) {
        setStaleFixIds((prev) => new Set(prev).add(fix.id));
        return;
      }

      // Surgical replace
      const updated = sectionText.replace(fix.currentSnippet, fix.fixedSnippet);
      pushPlaceholders({ ...placeholders, [fix.section]: updated });
      setAcceptedFixIds((prev) => new Set(prev).add(fix.id));

      // Check if other pending fixes in the same section are now stale
      if (scoreResult) {
        const newStale = new Set(staleFixIds);
        for (const other of scoreResult.fixes) {
          if (
            other.id !== fix.id &&
            other.section === fix.section &&
            !other.append && // Append fixes are never stale
            !acceptedFixIds.has(other.id) &&
            !skippedFixIds.has(other.id)
          ) {
            // Re-check against the updated text
            if (!updated.includes(other.currentSnippet)) {
              newStale.add(other.id);
            }
          }
        }
        setStaleFixIds(newStale);
      }
    },
    [placeholders, pushPlaceholders, scoreResult, acceptedFixIds, skippedFixIds, staleFixIds],
  );

  const handleAcceptAllFixes = useCallback(() => {
    if (!placeholders || !scoreResult) return;

    const newAccepted = new Set(acceptedFixIds);
    const newStale = new Set(staleFixIds);
    const updatedPlaceholders = { ...placeholders };

    // Process fixes section by section, in order
    for (const fix of scoreResult.fixes) {
      if (newAccepted.has(fix.id) || skippedFixIds.has(fix.id) || newStale.has(fix.id)) continue;

      const sectionText = updatedPlaceholders[fix.section] || "";

      // Append-style fix: append keyword to current section state
      if (fix.append) {
        const trimmed = sectionText.trimEnd().replace(/[,.;]\s*$/, "");
        updatedPlaceholders[fix.section] = trimmed
          ? `${trimmed}, ${fix.append}`
          : fix.append;
        newAccepted.add(fix.id);
        continue;
      }

      if (!sectionText || !sectionText.includes(fix.currentSnippet)) {
        newStale.add(fix.id);
        continue;
      }

      updatedPlaceholders[fix.section] = sectionText.replace(
        fix.currentSnippet,
        fix.fixedSnippet,
      );
      newAccepted.add(fix.id);

      // Check remaining fixes in same section for staleness
      for (const other of scoreResult.fixes) {
        if (
          other.id !== fix.id &&
          other.section === fix.section &&
          !other.append && // Append fixes are never stale
          !newAccepted.has(other.id) &&
          !skippedFixIds.has(other.id) &&
          !newStale.has(other.id)
        ) {
          if (!updatedPlaceholders[fix.section].includes(other.currentSnippet)) {
            newStale.add(other.id);
          }
        }
      }
    }

    pushPlaceholders(updatedPlaceholders);
    setAcceptedFixIds(newAccepted);
    setStaleFixIds(newStale);
  }, [placeholders, scoreResult, acceptedFixIds, skippedFixIds, staleFixIds, pushPlaceholders]);

  // Invalidate score cache when resume is regenerated
  const invalidateScore = useCallback(() => {
    setScoreResult(null);
    setShowScorePanel(false);
    setAcceptedFixIds(new Set());
    setSkippedFixIds(new Set());
    setStaleFixIds(new Set());
    sessionStorage.removeItem("resume_score_cache");
  }, []);

  // ── Add missing skill to profile ──
  const [addedSkills, setAddedSkills] = useState<Set<string>>(new Set());

  const handleAddSkill = useCallback(
    async (skill: string) => {
      // Add to local profile state
      const existingSkills = flattenSkills(userProfile.skills);
      if (existingSkills.some((s) => s.toLowerCase() === skill.toLowerCase())) {
        toast.info(`"${skill}" is already in your skills`);
        return;
      }

      // Categorize and merge
      const newCategory = categorizeSkills([skill]);
      const updatedSkills = { ...userProfile.skills };
      for (const [cat, items] of Object.entries(newCategory)) {
        if (!updatedSkills[cat]) updatedSkills[cat] = [];
        updatedSkills[cat] = [...updatedSkills[cat], ...items];
      }

      const updatedProfile = { ...userProfile, skills: updatedSkills };
      setUserProfile(updatedProfile);
      setAddedSkills((prev) => new Set(prev).add(skill.toLowerCase()));

      // Also update the job analysis locally — move skill from missing to matched
      if (jobAnalysis) {
        setJobAnalysis({
          ...jobAnalysis,
          matchedSkills: [...jobAnalysis.matchedSkills, skill],
          missingSkills: jobAnalysis.missingSkills.filter(
            (s) => s.toLowerCase() !== skill.toLowerCase(),
          ),
          matchScore: Math.round(
            ((jobAnalysis.matchedSkills.length + 1) / jobAnalysis.skills.length) * 100,
          ),
        });
      }

      // Persist to DB
      try {
        await fetch("/api/profile", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ skills: updatedSkills }),
        });
        toast.success(`Added "${skill}" to your skills`);
      } catch {
        toast.error("Failed to save skill");
      }

      // Invalidate score cache since profile changed
      invalidateScore();
    },
    [userProfile, jobAnalysis, invalidateScore],
  );

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
        if (await handleRateLimit(res)) {
          // rate-limited — toast already shown
        } else if (res.ok) {
          const data = await res.json();
          setJobAnalysis(data);
        } else {
          const err = await res.json().catch(() => ({ error: "Unknown error" }));
          console.error("Analyze job failed:", err);
          toast.error(
            `Job analysis failed: ${err.error || "Try a different model"}`,
          );
        }
      } catch (err) {
        console.error("Analyze job error:", err);
        toast.error("Job analysis failed — check console");
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

        if (await handleRateLimit(tailorRes)) {
          setIsLoading(false);
          return;
        }
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
        invalidateScore();

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
      invalidateScore,
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

  // Compute which job keywords actually appear in the resume text (client-side, deterministic)
  // Splits compound keywords like "JavaScript & TypeScript" into atomic terms for accurate matching
  const resumeMatchedKeywords = useMemo(() => {
    if (!jobAnalysis?.skills?.length || !placeholders) return undefined;

    const resumeText = Object.values(placeholders).join(" ").toLowerCase();

    // Split compound keywords into atomic terms
    // "CSS frameworks & component libraries (Tailwind, Material UI, styled-components, CSS Modules)"
    // → ["CSS frameworks", "component libraries", "Tailwind", "Material UI", "styled-components", "CSS Modules"]
    const atomize = (kw: string): string[] => {
      // Extract parenthetical list items first
      const parenMatch = kw.match(/\(([^)]+)\)/);
      const parenItems = parenMatch
        ? parenMatch[1].split(",").map((s) => s.trim()).filter(Boolean)
        : [];

      // Get the part before parentheses
      const mainPart = kw.replace(/\s*\([^)]*\)\s*/g, "").trim();

      // Split main part by & / and / ,
      const mainItems = mainPart
        .split(/\s*[&,/]\s*|\s+and\s+/i)
        .map((s) => s.trim())
        .filter((s) => s.length >= 2);

      const all = [...mainItems, ...parenItems].filter((s) => s.length >= 2);
      return all.length > 0 ? all : [kw];
    };

    // Check if an atomic term appears in the resume text with word boundaries
    const foundInResume = (term: string): boolean => {
      const termLower = term.toLowerCase();
      let searchFrom = 0;
      while (searchFrom < resumeText.length) {
        const idx = resumeText.indexOf(termLower, searchFrom);
        if (idx === -1) return false;

        const before = idx > 0 ? resumeText[idx - 1] : " ";
        const after = idx + termLower.length < resumeText.length ? resumeText[idx + termLower.length] : " ";
        const boundary = /[\s,;.:()\-/&|!#'"[\]{}+]/;

        if (boundary.test(before) && boundary.test(after)) return true;
        searchFrom = idx + 1;
      }
      return false;
    };

    // Collect all atomic terms that match
    const matched = new Set<string>();
    for (const kw of jobAnalysis.skills) {
      for (const term of atomize(kw)) {
        if (foundInResume(term)) {
          matched.add(term);
        }
      }
    }

    return matched.size > 0 ? [...matched] : undefined;
  }, [jobAnalysis?.skills, placeholders]);

  return (
    <>
      <div className="container mx-auto flex flex-1 flex-col px-4 pt-6 pb-12">
        {/* Header */}
        <AppHeader
          usage={{
            usageCount,
            maxAttempts,
            isSubscribed,
            cancelAt,
            resetsAt,
          }}
        >
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
                invalidateScore();
              }}
            >
              Clear
            </Button>
          )}
          <ModelSelector
            selectedModelId={selectedModel}
            onModelChange={setSelectedModel}
          />
        </AppHeader>

        <div className="flex flex-1 flex-col items-start gap-8 xl:flex-row">
          {/* Left panel */}
          <div className="flex w-full flex-col gap-6 xl:gap-8">
            {showScorePanel ? (
              <ScorePanel
                result={scoreResult}
                isLoading={isScoring}
                progress={scoreProgress}
                acceptedIds={acceptedFixIds}
                skippedIds={skippedFixIds}
                staleIds={staleFixIds}
                onAcceptFix={handleAcceptFix}
                onSkipFix={(id) => setSkippedFixIds((prev) => new Set(prev).add(id))}
                onAcceptAll={handleAcceptAllFixes}
                onReanalyze={handleReanalyze}
                onClose={() => setShowScorePanel(false)}
              />
            ) : (
            <>
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
                  onAddSkill={handleAddSkill}
                  addedSkills={addedSkills}
                />
              )}
            </div>

            {error && <p className="text-destructive text-sm">{error}</p>}

            {!authLoading && !user ? (
              <SignInButton />
            ) : (
              <>
              <div className="flex flex-wrap items-center gap-3">
                {/* Primary action */}
                <Button
                  size="lg"
                  className="flex-1"
                  onClick={() => handleTailor()}
                  disabled={isLoading || authLoading || !usageLoaded || (!isSubscribed && attemptsLeft <= 0)}
                >
                  {isLoading ? "Tailoring..." : "Tailor Resume"}
                </Button>

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

              </div>

              {/* Limit reached banner */}
              {!isSubscribed && attemptsLeft <= 0 && (
                <LimitReachedBanner resetsAt={resetsAt} />
              )}
              </>
            )}
            </>
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
                      <Button
                        size="sm"
                        variant="outline"
                        className="shrink-0 text-xs"
                        disabled={!user || !placeholders || !jobDescriptionRef.current || !jobAnalysis?.skills?.length}
                        onClick={handleScore}
                      >
                        {isScoring ? (
                          <div className="border-primary mr-1.5 size-3 animate-spin rounded-full border-2 border-t-transparent" />
                        ) : (
                          <svg className="mr-1.5 size-3" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 3l1.912 5.813a2 2 0 0 0 1.275 1.275L21 12l-5.813 1.912a2 2 0 0 0-1.275 1.275L12 21l-1.912-5.813a2 2 0 0 0-1.275-1.275L3 12l5.813-1.912a2 2 0 0 0 1.275-1.275L12 3z" />
                          </svg>
                        )}
                        {isScoring
                          ? `${scoreProgress}%`
                          : scoreResult
                            ? `Score: ${scoreResult.score}`
                            : "Score"}
                      </Button>
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
                contactFields={userProfile.contact_fields}
                highlightKeywords={resumeMatchedKeywords}
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

// ── Limit Reached Banner ─────────────────────────────────────────────

function LimitReachedBanner({ resetsAt }: { resetsAt?: string }) {
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [requestReason, setRequestReason] = useState("");
  const [requestPending, setRequestPending] = useState(false);
  const [requestSubmitting, setRequestSubmitting] = useState(false);

  const [showReferral, setShowReferral] = useState(false);
  const [referralData, setReferralData] = useState<{
    referralUrl: string;
    completedCount: number;
    bonusEarned: number;
  } | null>(null);
  const [referralLoading, setReferralLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Check for pending request on mount
  useEffect(() => {
    fetch("/api/quota-request")
      .then((res) => res.json())
      .then((data: { hasPending?: boolean }) => {
        setRequestPending(!!data.hasPending);
      })
      .catch(() => {});
  }, []);

  const handleSubmitRequest = async () => {
    setRequestSubmitting(true);
    try {
      const res = await fetch("/api/quota-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: requestReason }),
      });
      if (res.ok) {
        setRequestPending(true);
        setShowRequestForm(false);
        setRequestReason("");
      }
    } catch {
      // silently fail
    } finally {
      setRequestSubmitting(false);
    }
  };

  const handleShowReferral = async () => {
    if (referralData) {
      setShowReferral(!showReferral);
      return;
    }
    setReferralLoading(true);
    setShowReferral(true);
    try {
      const res = await fetch("/api/referral");
      const data = await res.json();
      setReferralData(data);
    } catch {
      // silently fail
    } finally {
      setReferralLoading(false);
    }
  };

  const handleCopyReferral = async () => {
    if (!referralData) return;
    await navigator.clipboard.writeText(referralData.referralUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const resetLabel = resetsAt
    ? new Date(resetsAt).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        timeZoneName: "short",
      })
    : "midnight UTC";

  return (
    <div className="bg-muted/50 border p-4 space-y-3">
      <div>
        <p className="text-sm font-medium">Daily limit reached</p>
        <p className="text-muted-foreground text-xs">
          Your free resumes reset at {resetLabel}. Need more?
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        {/* Request More */}
        {requestPending ? (
          <span className="text-muted-foreground text-xs">Request pending ✓</span>
        ) : !showRequestForm ? (
          <button
            type="button"
            className="text-primary cursor-pointer text-xs font-medium hover:underline"
            onClick={() => setShowRequestForm(true)}
          >
            Request more
          </button>
        ) : null}

        <span className="text-muted-foreground text-xs">or</span>

        {/* Invite a Friend */}
        <button
          type="button"
          className="text-primary cursor-pointer text-xs font-medium hover:underline"
          onClick={handleShowReferral}
        >
          Invite a friend (+5/day)
        </button>
      </div>

      {/* Request form */}
      {showRequestForm && (
        <div className="space-y-2">
          <textarea
            className="border-input bg-background w-full border px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
            placeholder="Why do you need more? (optional)"
            rows={2}
            value={requestReason}
            onChange={(e) => setRequestReason(e.target.value)}
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleSubmitRequest}
              disabled={requestSubmitting}
            >
              {requestSubmitting ? "Sending..." : "Send Request"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setShowRequestForm(false);
                setRequestReason("");
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Referral section */}
      {showReferral && (
        <div className="space-y-2">
          {referralLoading ? (
            <div className="flex items-center gap-1.5">
              <div className="border-primary size-3 animate-spin rounded-full border-2 border-t-transparent" />
              <span className="text-muted-foreground text-xs">Loading...</span>
            </div>
          ) : referralData ? (
            <>
              <p className="text-muted-foreground text-xs">
                Share this link. When someone signs up, you get +5 resumes/day.
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={referralData.referralUrl}
                  className="border-input bg-background flex-1 border px-3 py-1.5 text-xs"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCopyReferral}
                >
                  {copied ? "Copied!" : "Copy"}
                </Button>
              </div>
              {referralData.completedCount > 0 && (
                <p className="text-xs font-medium text-green-600">
                  {referralData.completedCount} referral{referralData.completedCount !== 1 ? "s" : ""} · +{referralData.bonusEarned}/day earned
                </p>
              )}
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}
