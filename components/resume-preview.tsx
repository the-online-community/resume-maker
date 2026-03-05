"use client";

import { forwardRef, useCallback, useEffect, useRef, useState } from "react";

import { AiSectionEditor } from "@/components/ai-section-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { RESUME_CSS } from "@/lib/resume-styles";

/**
 * US Letter: 8.5 × 11 in. With 0.5 in @page margins → 7.5 × 10 in content area.
 * At 96 CSS-px/in → 720 × 960 px.
 *
 * Content always renders at CONTENT_WIDTH with NO padding.
 * Visual whitespace in preview comes from PAGE_PADDING on the page frame.
 * Print whitespace comes from @page margins.
 */
const CONTENT_WIDTH = 720;
const PAGE_HEIGHT = 960;
const PAGE_PADDING = 32;
const FRAME_WIDTH = CONTENT_WIDTH + PAGE_PADDING * 2; // 784

interface ResumePreviewProps {
  placeholders: Record<string, string> | null;
  isLoading: boolean;
  isStreaming?: boolean;
  onDownloadPdf?: () => void;
  onPlaceholderChange?: (key: string, value: string) => void;
  jobDescription?: string;
}

/** Ensure a URL has a protocol prefix for href. */
function toUrl(value: string) {
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value}`;
}

/** Popover for editing a link's display label and URL. */
function LinkEditPopover({
  label,
  url,
  onSave,
  className,
}: {
  label: string;
  url: string;
  onSave: (label: string, url: string) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [editLabel, setEditLabel] = useState(label);
  const [editUrl, setEditUrl] = useState(url);

  const handleOpen = (nextOpen: boolean) => {
    if (nextOpen) {
      setEditLabel(label);
      setEditUrl(url);
    }
    setOpen(nextOpen);
  };

  const handleSave = () => {
    onSave(editLabel.trim(), editUrl.trim());
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={handleOpen}>
      <PopoverTrigger asChild>
        <span
          className={`resume-link resume-editable cursor-pointer ${className ?? ""}`}
          role="button"
          tabIndex={0}
        >
          {label}
        </span>
      </PopoverTrigger>
      <PopoverContent
        className="w-72 space-y-3 p-3"
        side="bottom"
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="space-y-1.5">
          <label className="text-muted-foreground text-xs font-medium">
            Label
          </label>
          <Input
            value={editLabel}
            onChange={(e) => setEditLabel(e.target.value)}
            placeholder="Display text"
            className="h-8 text-sm"
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-muted-foreground text-xs font-medium">
            URL
          </label>
          <Input
            value={editUrl}
            onChange={(e) => setEditUrl(e.target.value)}
            placeholder="https://..."
            className="h-8 text-sm"
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
          />
        </div>
        <Button size="sm" className="w-full" onClick={handleSave}>
          Save
        </Button>
      </PopoverContent>
    </Popover>
  );
}

/** The actual resume sections — rendered once per visual page (cheap, just text). */
function ResumeContent({
  placeholders,
  isStreaming,
  onEdit,
  jobDescription,
}: {
  placeholders: Record<string, string>;
  isStreaming?: boolean;
  onEdit?: (key: string, value: string) => void;
  jobDescription?: string;
}) {
  const editable = !isStreaming && !!onEdit;

  const handleBlur = (key: string) => (e: React.FocusEvent<HTMLElement>) => {
    const text = e.currentTarget.innerText.trim();
    if (text !== placeholders[key]) {
      onEdit?.(key, text);
    }
  };

  const handleLinkSave = (key: string, label: string, url: string) => {
    onEdit?.(key, label);
    onEdit?.(`${key}_URL`, url);
  };

  return (
    <>
      {/* Shared resume styles */}
      <style>{RESUME_CSS}</style>

      {/* Header */}
      <div className="resume-header">
        <h1
          contentEditable={editable}
          suppressContentEditableWarning
          onBlur={handleBlur("FULL_NAME")}
          className={editable ? "resume-editable" : undefined}
        >
          {placeholders.FULL_NAME || "—"}
        </h1>
        {placeholders.JOB_TITLE && (
          <p
            className={`resume-job-title${editable ? "resume-editable" : ""}`}
            contentEditable={editable}
            suppressContentEditableWarning
            onBlur={handleBlur("JOB_TITLE")}
          >
            {placeholders.JOB_TITLE}
          </p>
        )}
        <div className="resume-contact">
          {placeholders.EMAIL && (
            <span className="resume-contact-item">
              {editable ? (
                <LinkEditPopover
                  label={placeholders.EMAIL}
                  url={placeholders.EMAIL_URL || `mailto:${placeholders.EMAIL}`}
                  onSave={(lbl, href) => handleLinkSave("EMAIL", lbl, href)}
                />
              ) : (
                <a
                  className="resume-link"
                  href={
                    placeholders.EMAIL_URL || `mailto:${placeholders.EMAIL}`
                  }
                >
                  {placeholders.EMAIL}
                </a>
              )}
            </span>
          )}
          {placeholders.LINKEDIN && (
            <span className="resume-contact-item">
              {editable ? (
                <LinkEditPopover
                  label={placeholders.LINKEDIN}
                  url={
                    placeholders.LINKEDIN_URL || toUrl(placeholders.LINKEDIN)
                  }
                  onSave={(lbl, href) => handleLinkSave("LINKEDIN", lbl, href)}
                />
              ) : (
                <a
                  className="resume-link"
                  href={
                    placeholders.LINKEDIN_URL || toUrl(placeholders.LINKEDIN)
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {placeholders.LINKEDIN}
                </a>
              )}
            </span>
          )}
          {placeholders.GITHUB && (
            <span className="resume-contact-item">
              {editable ? (
                <LinkEditPopover
                  label={placeholders.GITHUB}
                  url={placeholders.GITHUB_URL || toUrl(placeholders.GITHUB)}
                  onSave={(lbl, href) => handleLinkSave("GITHUB", lbl, href)}
                />
              ) : (
                <a
                  className="resume-link"
                  href={placeholders.GITHUB_URL || toUrl(placeholders.GITHUB)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {placeholders.GITHUB}
                </a>
              )}
            </span>
          )}
          {placeholders.WEBSITE && (
            <span className="resume-contact-item">
              {editable ? (
                <LinkEditPopover
                  label={placeholders.WEBSITE}
                  url={placeholders.WEBSITE_URL || toUrl(placeholders.WEBSITE)}
                  onSave={(lbl, href) => handleLinkSave("WEBSITE", lbl, href)}
                />
              ) : (
                <a
                  className="resume-link"
                  href={placeholders.WEBSITE_URL || toUrl(placeholders.WEBSITE)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {placeholders.WEBSITE}
                </a>
              )}
            </span>
          )}
          {placeholders.PHONE && (
            <span className="resume-contact-item">
              <span
                contentEditable={editable}
                suppressContentEditableWarning
                onBlur={handleBlur("PHONE")}
                className={editable ? "resume-editable" : undefined}
              >
                {placeholders.PHONE}
              </span>
            </span>
          )}
          {placeholders.LOCATION && (
            <span className="resume-contact-item">
              <span
                contentEditable={editable}
                suppressContentEditableWarning
                onBlur={handleBlur("LOCATION")}
                className={editable ? "resume-editable" : undefined}
              >
                {placeholders.LOCATION}
              </span>
            </span>
          )}
        </div>
      </div>

      {/* Summary */}
      {placeholders.SUMMARY && (
        <AiSectionEditor
          sectionKey="SUMMARY"
          currentContent={placeholders.SUMMARY}
          jobDescription={jobDescription}
          editable={editable}
          onAccept={(val) => onEdit?.("SUMMARY", val)}
        >
          <section className="resume-section">
            <h2>Summary</h2>
            <p
              contentEditable={editable}
              suppressContentEditableWarning
              onBlur={handleBlur("SUMMARY")}
              className={editable ? "resume-editable" : undefined}
            >
              {placeholders.SUMMARY}
            </p>
          </section>
        </AiSectionEditor>
      )}

      {/* Experience */}
      {placeholders.EXPERIENCE && (
        <AiSectionEditor
          sectionKey="EXPERIENCE"
          currentContent={placeholders.EXPERIENCE}
          jobDescription={jobDescription}
          editable={editable}
          onAccept={(val) => onEdit?.("EXPERIENCE", val)}
        >
          <section className="resume-section">
            <h2>Experience</h2>
            <div
              contentEditable={editable}
              suppressContentEditableWarning
              onBlur={handleBlur("EXPERIENCE")}
              className={editable ? "resume-editable" : undefined}
            >
              {placeholders.EXPERIENCE.split("\n").map((line, i) => {
                const trimmed = line.trim();
                if (!trimmed) return <br key={i} />;
                const isBullet = /^[•\-*]/.test(trimmed);
                return (
                  <div
                    key={i}
                    style={isBullet ? undefined : { fontWeight: 600 }}
                  >
                    {line}
                  </div>
                );
              })}
            </div>
          </section>
        </AiSectionEditor>
      )}

      {/* Education */}
      {placeholders.EDUCATION && (
        <section className="resume-section">
          <h2>Education</h2>
          <div
            contentEditable={editable}
            suppressContentEditableWarning
            onBlur={handleBlur("EDUCATION")}
            className={editable ? "resume-editable" : undefined}
          >
            {placeholders.EDUCATION}
          </div>
        </section>
      )}

      {/* Skills */}
      {placeholders.SKILLS && (
        <section className="resume-section">
          <h2>Skills</h2>
          <p
            contentEditable={editable}
            suppressContentEditableWarning
            onBlur={handleBlur("SKILLS")}
            className={editable ? "resume-editable" : undefined}
          >
            {placeholders.SKILLS}
          </p>
        </section>
      )}

      {/* Certifications */}
      {placeholders.CERTIFICATIONS && (
        <section className="resume-section">
          <h2>Certifications</h2>
          <div
            contentEditable={editable}
            suppressContentEditableWarning
            onBlur={handleBlur("CERTIFICATIONS")}
            className={editable ? "resume-editable" : undefined}
          >
            {placeholders.CERTIFICATIONS}
          </div>
        </section>
      )}

      {/* Streaming skeletons */}
      {isStreaming && (
        <div className="mt-4 space-y-4">
          {!placeholders.EXPERIENCE && (
            <div>
              <Skeleton className="mb-2 h-4 w-24" />
              <Skeleton className="mb-1.5 h-3.5 w-full" />
              <Skeleton className="mb-1.5 h-3.5 w-full" />
              <Skeleton className="h-3.5 w-3/4" />
            </div>
          )}
          {!placeholders.EDUCATION && (
            <div>
              <Skeleton className="mb-2 h-4 w-22" />
              <Skeleton className="mb-1.5 h-3.5 w-3/5" />
              <Skeleton className="h-3.5 w-2/5" />
            </div>
          )}
          {!placeholders.SKILLS && (
            <div>
              <Skeleton className="mb-2 h-4 w-16" />
              <Skeleton className="h-3.5 w-full" />
            </div>
          )}
        </div>
      )}
    </>
  );
}

const ResumePreview = forwardRef<HTMLDivElement, ResumePreviewProps>(
  function ResumePreview(
    {
      placeholders,
      isLoading,
      isStreaming,
      onDownloadPdf,
      onPlaceholderChange,
      jobDescription,
    },
    ref,
  ) {
    const measureRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [pageCount, setPageCount] = useState(1);
    const [scale, setScale] = useState(1);

    // Merge the forwarded ref with our measurement ref
    const setMeasureRef = useCallback(
      (node: HTMLDivElement | null) => {
        (measureRef as React.MutableRefObject<HTMLDivElement | null>).current =
          node;
        if (typeof ref === "function") {
          ref(node);
        } else if (ref) {
          (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
        }
      },
      [ref],
    );

    // Measure content height → page count
    // No padding on measurement div, so scrollHeight = pure content height
    useEffect(() => {
      const el = measureRef.current;
      if (!el || !placeholders) return;

      const observer = new ResizeObserver(() => {
        const pages = Math.max(1, Math.ceil(el.scrollHeight / PAGE_HEIGHT));
        setPageCount(pages);
      });

      observer.observe(el);
      return () => observer.disconnect();
    }, [placeholders]);

    // Responsive scaling — fit the page frames into the container
    useEffect(() => {
      const container = containerRef.current;
      if (!container) return;

      const observer = new ResizeObserver(([entry]) => {
        const available = entry.contentRect.width;
        setScale(Math.min(1, available / FRAME_WIDTH));
      });

      observer.observe(container);
      return () => observer.disconnect();
    }, []);

    if (isLoading) {
      return (
        <div className="min-h-143 border p-8">
          <div className="mb-6 border-b pb-4">
            <Skeleton className="mb-2 h-7 w-48" />
            <div className="flex gap-3">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
          <div className="mb-5">
            <Skeleton className="mb-2 h-4 w-20" />
            <Skeleton className="mb-1.5 h-3.5 w-full" />
            <Skeleton className="mb-1.5 h-3.5 w-full" />
            <Skeleton className="h-3.5 w-3/4" />
          </div>
          <div className="mb-5">
            <Skeleton className="mb-2 h-4 w-24" />
            <Skeleton className="mb-1.5 h-3.5 w-2/3" />
            <Skeleton className="mb-1.5 h-3.5 w-full" />
            <Skeleton className="mb-1.5 h-3.5 w-full" />
            <Skeleton className="mb-3 h-3.5 w-5/6" />
            <Skeleton className="mb-1.5 h-3.5 w-1/2" />
            <Skeleton className="mb-1.5 h-3.5 w-full" />
            <Skeleton className="h-3.5 w-4/5" />
          </div>
          <div className="mb-5">
            <Skeleton className="mb-2 h-4 w-22" />
            <Skeleton className="mb-1.5 h-3.5 w-3/5" />
            <Skeleton className="h-3.5 w-2/5" />
          </div>
          <div>
            <Skeleton className="mb-2 h-4 w-16" />
            <Skeleton className="h-3.5 w-full" />
          </div>
        </div>
      );
    }

    if (!placeholders) {
      return (
        <div className="text-muted-foreground flex h-fit min-h-143 flex-col items-center justify-center border p-10 text-center text-sm">
          <p>Your tailored resume will appear here</p>
          <p className="mt-1 text-xs">
            Paste a job description, upload your resumes, and click &quot;Tailor
            Resume&quot;
          </p>
        </div>
      );
    }

    // Total visual height of all pages (for negative margin calculation after scale)
    const totalVisualHeight =
      pageCount * (PAGE_HEIGHT + PAGE_PADDING * 2) + (pageCount - 1) * 24;

    return (
      <div className="flex flex-col gap-4">
        {/* Hidden measurement div — NO padding, matches print content width */}
        <div
          ref={setMeasureRef}
          className="resume-page absolute -left-[9999px]"
          style={{ width: CONTENT_WIDTH }}
          aria-hidden="true"
        >
          <ResumeContent
            placeholders={placeholders}
            isStreaming={isStreaming}
          />
        </div>

        {/* Visual pages — responsive scaled */}
        <div ref={containerRef} className="w-full">
          <div
            style={{
              transform: `scale(${scale})`,
              transformOrigin: "top left",
              width: FRAME_WIDTH,
              // Correct the space after scaling (transform doesn't affect flow)
              marginBottom: -(1 - scale) * totalVisualHeight,
            }}
          >
            {Array.from({ length: pageCount }, (_, i) => {
              const isLast = i === pageCount - 1;
              return (
                <div
                  key={i}
                  className="relative mb-6 border bg-white"
                  style={{
                    width: FRAME_WIDTH,
                    padding: PAGE_PADDING,
                  }}
                >
                  {/* Page number label — top right */}
                  {pageCount > 0 && (
                    <span className="text-muted-foreground pointer-events-none absolute top-2 right-3 z-10 bg-white px-1 text-[10px] font-medium">
                      {i + 1} / {pageCount}
                    </span>
                  )}

                  {/* Clip layer — clips exactly at PAGE_HEIGHT */}
                  <div
                    className="overflow-hidden"
                    style={{
                      width: CONTENT_WIDTH,
                      height: isLast ? "auto" : PAGE_HEIGHT,
                      maxHeight: isLast ? undefined : PAGE_HEIGHT,
                    }}
                  >
                    {/* Content slice — offset by page index */}
                    <div
                      className="resume-page"
                      style={{ marginTop: -(i * PAGE_HEIGHT) }}
                    >
                      <ResumeContent
                        placeholders={placeholders}
                        isStreaming={isStreaming}
                        onEdit={i === 0 ? onPlaceholderChange : undefined}
                        jobDescription={i === 0 ? jobDescription : undefined}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tip + download */}
        {!isStreaming && (
          <div className="flex flex-col gap-3">
            {pageCount > 1 && (
              <p className="text-destructive/70 text-center text-xs">
                Tip: Keep it to 1 page for best results
              </p>
            )}
            <Button size="lg" onClick={onDownloadPdf}>
              Download PDF
            </Button>
          </div>
        )}
      </div>
    );
  },
);

export default ResumePreview;
