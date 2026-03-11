"use client";

import {
  Loading03Icon,
  Mic01Icon,
  PauseIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";

import ResumeDropzone from "@/components/resume/resume-dropzone";
import ResumePreview from "@/components/resume/resume-preview";
import { ResumeAnalyzerDialog } from "@/components/resume/resume-analyzer-dialog";
import { TemplateSettingsDialog } from "@/components/resume/template-settings-dialog";
import SignInButton from "@/components/sign-in-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { UserMenu } from "@/components/user-menu";
import { useSpeechToText } from "@/hooks/use-speech-to-text";
import { useUndoHistory } from "@/hooks/use-undo-history";
import { useUser } from "@/hooks/use-user";
import {
  getAllResumes,
  getAllSavedResumes,
  saveGeneratedResume,
  type SavedResumeEntry,
} from "@/lib/resume/resume-store";
import { RESUME_CSS, RESUME_PRINT_CSS } from "@/lib/resume/resume-styles";
import {
  DEFAULT_SETTINGS,
  DEFAULT_TEMPLATE,
  type TemplateSettings,
} from "@/lib/resume/templates";

const TextEditor = dynamic(() => import("@/components/text-editor"), {
  ssr: false,
});

export default function Page() {
  const { user, loading: authLoading } = useUser();
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
  const [isSaving, setIsSaving] = useState(false);
  const [customPrompt, setCustomPrompt] = useState("");
  const [promptDialogOpen, setPromptDialogOpen] = useState(false);
  const [promptDraft, setPromptDraft] = useState("");

  // Saved generated resumes (lifted from dropzone for AI context)
  const [savedGeneratedResumes, setSavedGeneratedResumes] = useState<
    SavedResumeEntry[]
  >([]);

  const MAX_ATTEMPTS = 5;
  const [usageCount, setUsageCount] = useState(0);
  const [usageLoaded, setUsageLoaded] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [cancelAt, setCancelAt] = useState<string | null>(null);

  // Template settings
  const [templateSettings, setTemplateSettings] =
    useState<TemplateSettings>(DEFAULT_SETTINGS);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Load saved generated resumes on mount
  useEffect(() => {
    getAllSavedResumes().then(setSavedGeneratedResumes);
  }, []);

  // Load template settings when user changes
  useEffect(() => {
    fetch("/api/template-settings")
      .then((res) => res.json())
      .then((data: TemplateSettings) => setTemplateSettings(data))
      .catch(() => {});
  }, [user]);

  // Fetch usage count from DB when user changes
  useEffect(() => {
    if (!user) return;
    setUsageLoaded(false);
    fetch("/api/usage")
      .then((res) => res.json())
      .then((data: { count: number; subscribed?: boolean; cancelAt?: string | null }) => {
        setUsageCount(data.count);
        setIsSubscribed(!!data.subscribed);
        setCancelAt(data.cancelAt ?? null);
      })
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

  const handleTailor = useCallback(async () => {
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
      // 1. Get uploaded resumes from IndexedDB
      const savedResumes = await getAllResumes();
      let resumeTexts: string[] = [];

      // 2. If uploaded resumes exist, parse them on the server
      if (savedResumes.length > 0) {
        const formData = new FormData();
        for (const resume of savedResumes) {
          formData.append("files", resume.file, resume.fileName);
        }

        const parseRes = await fetch("/api/parse-pdf", {
          method: "POST",
          body: formData,
        });

        if (!parseRes.ok) {
          throw new Error("Failed to parse PDF files");
        }

        const { results: parsedResumes } = (await parseRes.json()) as {
          results: { fileName: string; text: string }[];
        };

        resumeTexts = parsedResumes.map((r) => r.text);
      }

      // 3. Add saved (generated) resume texts as additional context
      for (const savedResume of savedGeneratedResumes) {
        const p = savedResume.placeholders;
        const parts: string[] = [];
        if (p.FULL_NAME) parts.push(`Name: ${p.FULL_NAME}`);
        if (p.JOB_TITLE) parts.push(`Title: ${p.JOB_TITLE}`);
        if (p.EMAIL) parts.push(`Email: ${p.EMAIL}`);
        if (p.PHONE) parts.push(`Phone: ${p.PHONE}`);
        if (p.LOCATION) parts.push(`Location: ${p.LOCATION}`);
        if (p.SUMMARY) parts.push(`Summary:\n${p.SUMMARY}`);
        if (p.EXPERIENCE) parts.push(`Experience:\n${p.EXPERIENCE}`);
        if (p.EDUCATION) parts.push(`Education:\n${p.EDUCATION}`);
        if (p.SKILLS) parts.push(`Skills: ${p.SKILLS}`);
        if (p.CERTIFICATIONS) parts.push(`Certifications: ${p.CERTIFICATIONS}`);
        resumeTexts.push(parts.join("\n\n"));
      }

      // 4. Tailor with AI (streamed) — if no resumes, pass user info for generation
      const tailorRes = await fetch("/api/tailor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobDescription,
          resumeTexts,
          placeholders: DEFAULT_TEMPLATE.placeholders,
          targetPages,
          userName: user?.user_metadata?.full_name || user?.user_metadata?.name,
          userEmail: user?.email,
          customPrompt: customPrompt || undefined,
          templateSettings,
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setIsStreaming(false);
    } finally {
      setIsLoading(false);
    }
  }, [targetPages, incrementUsage, user, savedGeneratedResumes, customPrompt, templateSettings, pushPlaceholders, setPlaceholders]);

  const handleDownloadPdf = useCallback(() => {
    const element = resumeRef.current;
    if (!element) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const title = placeholders?.FULL_NAME
      ? `Resume - ${placeholders.FULL_NAME}`
      : "Resume";

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
  }, [placeholders]);

  const handleSaveResume = useCallback(async () => {
    if (!placeholders) return;

    setIsSaving(true);
    try {
      const name = placeholders.FULL_NAME
        ? `${placeholders.FULL_NAME} — ${placeholders.JOB_TITLE || "Resume"}`
        : `Resume — ${new Date().toLocaleDateString()}`;

      const entry = await saveGeneratedResume(name, placeholders);
      setSavedGeneratedResumes((prev) => [...prev, entry]);
    } catch {
      setError("Failed to save resume");
    } finally {
      // Show "Saved!" briefly, then reset
      setTimeout(() => setIsSaving(false), 1500);
    }
  }, [placeholders]);

  return (
    <div className="container mx-auto flex flex-1 flex-col px-4 pt-6 pb-12">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between lg:mb-8">
        <h1 className="font-mono text-lg font-bold sm:text-xl">Resume Maker</h1>
        <div className="flex items-center gap-2">
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
          <div className="h-fit w-full">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-mono">Job Description</h2>
              {hasJobDescription && (
                <button
                  type="button"
                  onClick={() => editorResetRef.current?.()}
                  className="text-muted-foreground hover:text-destructive cursor-pointer text-xs transition-colors"
                >
                  Reset
                </button>
              )}
            </div>
            <TextEditor
              onTextChange={(text) => {
                jobDescriptionRef.current = text;
              }}
              onHasContentChange={setHasJobDescription}
              onResetRef={editorResetRef}
            />
          </div>

          {error && <p className="text-destructive text-sm">{error}</p>}

          {!authLoading && !user ? (
            <SignInButton />
          ) : (
            <div className="flex items-center gap-3">
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
                  onClick={handleTailor}
                  disabled={isLoading || authLoading || !usageLoaded}
                >
                  {isLoading ? "Tailoring..." : "Tailor Resume"}
                </Button>
              )}

              <Button
                size="lg"
                variant={customPrompt ? "default" : "outline"}
                className="shrink-0"
                onClick={() => {
                  setPromptDraft(customPrompt);
                  setPromptDialogOpen(true);
                }}
              >
                {customPrompt ? "Prompt ✓" : "Add Prompt"}
              </Button>

              <TemplateSettingsDialog
                settings={templateSettings}
                onSave={async (newSettings) => {
                  setIsSavingSettings(true);
                  try {
                    const res = await fetch("/api/template-settings", {
                      method: "PUT",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(newSettings),
                    });
                    if (res.ok) setTemplateSettings(newSettings);
                  } catch {
                    // silently fail
                  } finally {
                    setIsSavingSettings(false);
                  }
                }}
                isSaving={isSavingSettings}
                disabled={!user}
              />

              <ResumeAnalyzerDialog
                placeholders={placeholders}
                jobDescription={jobDescriptionRef.current}
                disabled={!user}
                onAcceptSuggestion={(section, newText) => {
                  if (placeholders) {
                    pushPlaceholders({ ...placeholders, [section]: newText });
                  }
                }}
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

          {/* Custom Prompt Dialog */}
          <Dialog open={promptDialogOpen} onOpenChange={setPromptDialogOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Custom Prompt</DialogTitle>
                <DialogDescription>
                  Add extra instructions for the AI when generating your resume.
                  For example: &quot;Focus on leadership experience&quot; or
                  &quot;Use a more formal tone&quot;.
                </DialogDescription>
              </DialogHeader>
              <div className="relative">
                <Textarea
                  value={promptDraft}
                  onChange={(e) => setPromptDraft(e.target.value)}
                  placeholder="e.g. Focus on backend engineering skills, emphasize cloud experience..."
                  className="min-h-32 pr-10"
                />
                <VoiceInputButton
                  onTranscript={(text) =>
                    setPromptDraft((prev) =>
                      prev ? `${prev} ${text}` : text,
                    )
                  }
                />
              </div>
              <DialogFooter className="gap-2">
                {customPrompt && (
                  <Button
                    variant="outline"
                    className="text-destructive"
                    onClick={() => {
                      setCustomPrompt("");
                      setPromptDraft("");
                      setPromptDialogOpen(false);
                    }}
                  >
                    Clear
                  </Button>
                )}
                <Button
                  onClick={() => {
                    setCustomPrompt(promptDraft.trim());
                    setPromptDialogOpen(false);
                  }}
                >
                  Save
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <div>
            <ResumeDropzone
              savedGeneratedResumes={savedGeneratedResumes}
              onSavedResumesChange={setSavedGeneratedResumes}
              onLoadResume={(p) => pushPlaceholders(p)}
            />
          </div>
        </div>

        {/* Right panel */}
        <div className="w-full">
          <h2 className="mb-4 font-mono">Resume</h2>
          <ResumePreview
            ref={resumeRef}
            placeholders={placeholders}
            isLoading={isLoading}
            isStreaming={isStreaming}
            onDownloadPdf={handleDownloadPdf}
            onSaveResume={handleSaveResume}
            isSaving={isSaving}
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
        </div>
      </div>
    </div>
  );
}

// ── Voice Input Button ────────────────────────────────────────────────

function VoiceInputButton({
  onTranscript,
}: {
  onTranscript: (text: string) => void;
}) {
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
        <HugeiconsIcon
          icon={Loading03Icon}
          className="size-3.5 animate-spin"
        />
      ) : (
        <HugeiconsIcon
          icon={isListening ? PauseIcon : Mic01Icon}
          className="size-3.5"
        />
      )}
    </button>
  );
}
