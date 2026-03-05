"use client";

import { useCallback, useRef, useState } from "react";
import dynamic from "next/dynamic";

import ResumeDropzone from "@/components/resume-dropzone";
import ResumePreview from "@/components/resume-preview";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { getAllResumes } from "@/lib/resume-store";
import { RESUME_CSS, RESUME_PRINT_CSS } from "@/lib/resume-styles";
import { DEFAULT_TEMPLATE } from "@/lib/templates";

const TextEditor = dynamic(() => import("@/components/text-editor"), {
  ssr: false,
});

export default function Page() {
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
      if (savedResumes.length === 0) {
        setError("Please upload at least one resume");
        setIsLoading(false);
        return;
      }

      // 2. Parse PDFs on the server
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

      const resumeTexts = parsedResumes.map((r) => r.text);

      // 3. Tailor with AI (streamed)
      const tailorRes = await fetch("/api/tailor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobDescription,
          resumeTexts,
          placeholders: DEFAULT_TEMPLATE.placeholders,
          targetPages,
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setIsStreaming(false);
    } finally {
      setIsLoading(false);
    }
  }, [targetPages]);

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
    <div className="flex flex-1 flex-col px-4 pt-6 pb-12 sm:px-8 md:px-12 lg:px-16 lg:pt-8 lg:pb-16">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between lg:mb-8">
        <h1 className="font-mono text-lg font-bold sm:text-xl">Resume Maker</h1>
        <ThemeToggle />
      </div>

      <div className="flex flex-1 flex-col gap-8 lg:flex-row">
        {/* Left panel */}
        <div className="flex w-full flex-col gap-6 lg:gap-8">
          <div className="h-fit w-full">
            <h2 className="mb-4 font-mono">Job Description</h2>
            <TextEditor
              onTextChange={(text) => {
                jobDescriptionRef.current = text;
              }}
            />
          </div>

          {error && <p className="text-destructive text-sm">{error}</p>}

          <div className="flex items-center gap-3">
            <Button
              size="lg"
              className="flex-1"
              onClick={handleTailor}
              disabled={isLoading}
            >
              {isLoading ? "Tailoring..." : "Tailor Resume"}
            </Button>

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
