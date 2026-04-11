"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  CONTENT_WIDTH,
  FRAME_WIDTH,
  PAGE_HEIGHT,
  PAGE_PADDING,
} from "@/components/resume/constants";
import { ResumeContent } from "@/components/resume/resume-content";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { ContactField } from "@/lib/profile";
import { RESUME_CSS, RESUME_PRINT_CSS } from "@/lib/resume/resume-styles";
import type { TemplateSettings } from "@/lib/resume/templates";

/**
 * Maximum pages we support. The measurement div creates this many CSS columns;
 * unused columns stay empty and don't affect layout.
 */
const MAX_PAGES = 10;

/** Shared inline styles for the CSS column container that drives pagination. */
const columnStyle = (pages: number): React.CSSProperties => ({
  width: CONTENT_WIDTH * pages,
  columnWidth: CONTENT_WIDTH,
  columnGap: 0,
  columnFill: "auto" as const,
  height: PAGE_HEIGHT,
});

interface ResumePreviewProps {
  placeholders: Record<string, string> | null;
  isLoading: boolean;
  isStreaming?: boolean;
  resumeTitle?: string;
  onPlaceholderChange?: (key: string, value: string) => void;
  onBatchPlaceholderChange?: (updates: Record<string, string>) => void;
  jobDescription?: string;
  templateSettings?: TemplateSettings;
  contactFields?: ContactField[];
  highlightKeywords?: string[];
}

export default function ResumePreview({
  placeholders,
  isLoading,
  isStreaming,
  resumeTitle,
  onPlaceholderChange,
  onBatchPlaceholderChange,
  jobDescription,
  templateSettings,
  contactFields,
  highlightKeywords,
}: ResumePreviewProps) {
    const measureRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [pageCount, setPageCount] = useState(1);
    const [scale, setScale] = useState(1);

    // Determine page count from the CSS column measurement div.
    // CSS columns apply break-inside/break-after rules natively, so the
    // page breaks here match what the browser's print engine produces.
    useEffect(() => {
      const root = measureRef.current;
      if (!root || !placeholders) return;

      const frameId = requestAnimationFrame(() => {
        const rootRect = root.getBoundingClientRect();
        const elements = root.querySelectorAll(
          ".resume-section, .resume-header",
        );
        let maxRight = CONTENT_WIDTH;
        for (const el of elements) {
          maxRight = Math.max(
            maxRight,
            el.getBoundingClientRect().right - rootRect.left,
          );
        }
        setPageCount(Math.max(1, Math.ceil(maxRight / CONTENT_WIDTH)));
      });

      return () => cancelAnimationFrame(frameId);
    }, [placeholders, isStreaming]);

    // PDF generation — flat content with CSS print break rules.
    // The browser's print engine uses the same break-inside/break-after
    // rules as the CSS column preview, guaranteeing identical pagination.
    const handleDownloadPdf = useCallback(() => {
      const el = measureRef.current;
      if (!el) return;

      const printWindow = window.open("", "_blank");
      if (!printWindow) return;

      const title = resumeTitle || "Resume";
      const contentHtml = el.innerHTML;

      printWindow.document.write(
        `<!DOCTYPE html><html><head><title>${title}</title><style>*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}${RESUME_CSS}${RESUME_PRINT_CSS}</style></head><body><div class="resume-page" style="width:${CONTENT_WIDTH}px">${contentHtml}</div></body></html>`,
      );
      printWindow.document.close();

      printWindow.onload = () => {
        printWindow.print();
        printWindow.close();
        // Fire-and-forget analytics
        fetch("/api/track-download", { method: "POST" }).catch(() => {});
      };
    }, [resumeTitle]);

    // Responsive scaling — fit the page frames into the container
    useEffect(() => {
      const container = containerRef.current;
      if (!container) return;

      const observer = new ResizeObserver(([entry]) => {
        const available = entry.contentRect.width;
        const base = Math.min(1, available / FRAME_WIDTH);
        setScale(available < 640 ? base * 0.92 : base);
      });

      observer.observe(container);
      return () => observer.disconnect();
    }, []);

    if (isLoading) {
      return (
        <div className="min-h-135 border p-8">
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
        <div className="text-muted-foreground flex h-fit min-h-136 flex-col items-center justify-center border p-10 text-center text-sm">
          <p>Your tailored resume will appear here</p>
        </div>
      );
    }

    // Total visual height of all pages (for negative margin calculation after scale)
    const pageFrameHeight = PAGE_HEIGHT + PAGE_PADDING * 2;
    const totalVisualHeight =
      pageCount * pageFrameHeight + (pageCount - 1) * 24;

    return (
      <div className="flex min-w-0 flex-col gap-4">
        {/* Hidden measurement div — CSS column layout determines page breaks.
            break-inside:avoid and break-after:avoid are applied by RESUME_CSS,
            so the browser paginates content into columns identically to how
            it paginates pages in print. */}
        <div
          ref={measureRef}
          className="resume-page"
          style={{
            position: "absolute",
            left: -99999,
            visibility: "hidden",
            ...columnStyle(MAX_PAGES),
          }}
          aria-hidden="true"
        >
          <ResumeContent
            placeholders={placeholders}
            isStreaming={isStreaming}
            templateSettings={templateSettings}
            contactFields={contactFields}
          />
        </div>

        {/* Visual pages — each frame clips one CSS column via translateX */}
        <div ref={containerRef} className="w-full">
          <div
            style={{
              transform: `scale(${scale})`,
              transformOrigin: "top left",
              width: FRAME_WIDTH,
              marginBottom: -(1 - scale) * totalVisualHeight,
              marginRight: -(1 - scale) * FRAME_WIDTH,
            }}
          >
            {Array.from({ length: pageCount }, (_, i) => {
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
                  {pageCount > 1 && (
                    <span className="text-muted-foreground pointer-events-none absolute top-2 right-3 z-10 bg-white px-1 text-[10px] font-medium">
                      {i + 1} / {pageCount}
                    </span>
                  )}

                  {/* Clip layer — clips exactly at PAGE_HEIGHT */}
                  <div
                    className="overflow-hidden"
                    style={{
                      width: CONTENT_WIDTH,
                      height: PAGE_HEIGHT,
                    }}
                  >
                    {/* Column container — shows column i via translateX */}
                    <div
                      className="resume-page"
                      style={{
                        ...columnStyle(MAX_PAGES),
                        transform: `translateX(${-i * CONTENT_WIDTH}px)`,
                      }}
                    >
                      <ResumeContent
                        placeholders={placeholders}
                        isStreaming={isStreaming}
                        onEdit={onPlaceholderChange}
                        onBatchEdit={onBatchPlaceholderChange}
                        jobDescription={jobDescription}
                        templateSettings={templateSettings}
                        contactFields={contactFields}
                        highlightKeywords={highlightKeywords}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        {!isStreaming && (
          <div className="flex gap-3">
            <Button size="lg" className="flex-1" onClick={handleDownloadPdf}>
              Download PDF
            </Button>
          </div>
        )}
      </div>
    );
}
