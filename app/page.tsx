"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";

import ResumeDropzone from "@/components/resume/resume-dropzone";
import ResumePreview from "@/components/resume/resume-preview";
import SignInButton from "@/components/sign-in-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { UserMenu } from "@/components/user-menu";
import { useUser } from "@/hooks/use-user";
import { getAllResumes } from "@/lib/resume/resume-store";
import { RESUME_CSS, RESUME_PRINT_CSS } from "@/lib/resume/resume-styles";
import { DEFAULT_TEMPLATE } from "@/lib/resume/templates";

const TextEditor = dynamic(() => import("@/components/text-editor"), {
  ssr: false,
});

export default function Page() {
  const { user, loading: authLoading } = useUser();
  const jobDescriptionRef = useRef("");
  const resumeRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [placeholders, setPlaceholders] = useState<Record<
    string,
    string
  > | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [targetPages, setTargetPages] = useState(1);
  const [hasJobDescription, setHasJobDescription] = useState(false);
  const editorResetRef = useRef<(() => void) | null>(null);

  const MAX_ATTEMPTS = 5;
  const [usageCount, setUsageCount] = useState(0);
  const [usageLoaded, setUsageLoaded] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [cancelAt, setCancelAt] = useState<string | null>(null);

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
      // 1. Get saved resumes from IndexedDB
      const savedResumes = await getAllResumes();
      let resumeTexts: string[] = [];

      // 2. If resumes exist, parse them on the server
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

      // 3. Tailor with AI (streamed) — if no resumes, pass user info for generation
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
      setPlaceholders(finalPlaceholders);
      setIsStreaming(false);
      incrementUsage();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setIsStreaming(false);
    } finally {
      setIsLoading(false);
    }
  }, [targetPages, incrementUsage, user]);

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

          <div>
            <ResumeDropzone />
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
            jobDescription={jobDescriptionRef.current}
            onPlaceholderChange={(key, value) =>
              setPlaceholders((prev) =>
                prev ? { ...prev, [key]: value } : prev,
              )
            }
          />
        </div>
      </div>
    </div>
  );
}
