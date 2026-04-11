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
import type { ContactField } from "@/lib/profile";
import type { TemplateSettings } from "@/lib/resume/templates";

interface ResumePreviewProps {
  placeholders: Record<string, string> | null;
  isLoading: boolean;
  isStreaming?: boolean;
  onDownloadPdf?: () => void;
  onPlaceholderChange?: (key: string, value: string) => void;
  onBatchPlaceholderChange?: (updates: Record<string, string>) => void;
  jobDescription?: string;
  templateSettings?: TemplateSettings;
  contactFields?: ContactField[];
  highlightKeywords?: string[];
}

const ResumePreview = forwardRef<HTMLDivElement, ResumePreviewProps>(
  function ResumePreview(
    {
      placeholders,
      isLoading,
      isStreaming,
      onDownloadPdf,
      onPlaceholderChange,
      onBatchPlaceholderChange,
      jobDescription,
      templateSettings,
      contactFields,
      highlightKeywords,
    },
    ref,
  ) {
    const measureRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [pageCount, setPageCount] = useState(1);
    const [scale, setScale] = useState(1);
    const [breakPadding, setBreakPadding] = useState<number[]>([]);

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

    // Callbacks from the measurement ResumeContent's page-break logic
    const handlePageCount = useCallback((count: number) => {
      setPageCount(count);
    }, []);

    const handleBreakPadding = useCallback((padding: number[]) => {
      setBreakPadding(padding);
    }, []);

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
    // Each page frame = PAGE_HEIGHT + 2*padding, plus 24px gap between pages
    const pageFrameHeight = PAGE_HEIGHT + PAGE_PADDING * 2;
    const totalVisualHeight =
      pageCount * pageFrameHeight + (pageCount - 1) * 24;

    return (
      <div className="flex min-w-0 flex-col gap-4">
        {/* Hidden measurement div — with page-break padding applied by ResumeContent */}
        <div
          ref={setMeasureRef}
          className="resume-page absolute -left-[9999px]"
          style={{ width: CONTENT_WIDTH }}
          aria-hidden="true"
        >
          <ResumeContent
            placeholders={placeholders}
            isStreaming={isStreaming}
            templateSettings={templateSettings}
            contactFields={contactFields}
            pageHeight={PAGE_HEIGHT}
            onPageCount={handlePageCount}
            onBreakPadding={handleBreakPadding}
          />
        </div>

        {/* Visual pages — responsive scaled */}
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
                    {/* Content slice — offset by page index */}
                    <div
                      className="resume-page"
                      style={{ marginTop: -(i * PAGE_HEIGHT) }}
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
                        pageHeight={PAGE_HEIGHT}
                        breakPadding={breakPadding}
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
            <Button size="lg" className="flex-1" onClick={onDownloadPdf}>
              Download PDF
            </Button>
          </div>
        )}
      </div>
    );
  },
);

export default ResumePreview;
