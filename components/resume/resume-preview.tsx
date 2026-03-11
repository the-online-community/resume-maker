"use client";

import { forwardRef, useCallback, useEffect, useRef, useState } from "react";

import {
  CONTENT_WIDTH,
  FRAME_WIDTH,
  PAGE_HEIGHT,
  PAGE_PADDING,
} from "@/components/resume/constants";
import { ResumeContent } from "@/components/resume/resume-content";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface ResumePreviewProps {
  placeholders: Record<string, string> | null;
  isLoading: boolean;
  isStreaming?: boolean;
  onDownloadPdf?: () => void;
  onSaveResume?: () => void;
  isSaving?: boolean;
  onPlaceholderChange?: (key: string, value: string) => void;
  jobDescription?: string;
}

const ResumePreview = forwardRef<HTMLDivElement, ResumePreviewProps>(
  function ResumePreview(
    {
      placeholders,
      isLoading,
      isStreaming,
      onDownloadPdf,
      onSaveResume,
      isSaving,
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
        const base = Math.min(1, available / FRAME_WIDTH);
        // Scale down a bit more on small screens for breathing room
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
      <div className="flex min-w-0 flex-col gap-4">
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
              marginRight: -(1 - scale) * FRAME_WIDTH,
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

        {/* Tip + actions */}
        {!isStreaming && (
          <div className="flex flex-col gap-3">
            {pageCount > 1 && (
              <p className="text-destructive/70 text-center text-xs">
                Tip: Keep it to 1 page for best results
              </p>
            )}
            <div className="flex gap-3">
              <Button size="lg" className="flex-1" onClick={onDownloadPdf}>
                Download PDF
              </Button>
              <Button
                size="lg"
                className="flex-1"
                variant="outline"
                onClick={onSaveResume}
                disabled={isSaving}
              >
                {isSaving ? "Saved!" : "Save Resume"}
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  },
);

export default ResumePreview;
