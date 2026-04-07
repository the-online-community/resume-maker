"use client";

import {
  BlockquotePlugin,
  BoldPlugin,
  H1Plugin,
  H2Plugin,
  H3Plugin,
  ItalicPlugin,
  UnderlinePlugin,
} from "@platejs/basic-nodes/react";
import type { Value } from "platejs";
import { Plate, usePlateEditor } from "platejs/react";
import { useCallback, useEffect, useRef, useState } from "react";

import { BlockquoteElement } from "@/components/ui/blockquote-node";
import { Editor, EditorContainer } from "@/components/ui/editor";
import { H1Element, H2Element, H3Element } from "@/components/ui/heading-node";
import { cn } from "@/lib/utils";

const initialValue: Value = [
  {
    children: [{ text: "" }],
    type: "p",
  },
];

export default function TextEditor({
  onTextChange,
  onHasContentChange,
  onResetRef,
  onUrlDetected,
  onSetContentRef,
}: {
  onTextChange?: (text: string) => void;
  onHasContentChange?: (hasContent: boolean) => void;
  onResetRef?: React.MutableRefObject<(() => void) | null>;
  onUrlDetected?: (url: string) => void;
  onSetContentRef?: React.MutableRefObject<((text: string) => void) | null>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [hasContent, setHasContent] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const urlDetectedRef = useRef(false);

  // LinkedIn URL pattern
  const LINKEDIN_URL_RE = /https?:\/\/(?:www\.)?linkedin\.com\/jobs\/(?:view|search)\S*/i;

  // ResizeObserver reliably detects overflow after DOM layout updates
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const check = () => setIsOverflowing(el.scrollHeight > el.clientHeight);

    const observer = new ResizeObserver(check);

    // Observe the container itself
    observer.observe(el);

    // Also observe the inner content (first child) so we detect when IT grows
    const inner = el.firstElementChild;
    if (inner) observer.observe(inner);

    // Check immediately
    check();

    return () => observer.disconnect();
  }, [expanded, hasContent]);

  const editor = usePlateEditor({
    plugins: [
      BoldPlugin,
      ItalicPlugin,
      UnderlinePlugin,
      H1Plugin.withComponent(H1Element),
      H2Plugin.withComponent(H2Element),
      H3Plugin.withComponent(H3Element),
      BlockquotePlugin.withComponent(BlockquoteElement),
    ],
    value: () => {
      if (typeof window === "undefined") return initialValue;
      const savedValue = localStorage.getItem("installation-next-demo");
      return savedValue ? JSON.parse(savedValue) : initialValue;
    },
  });

  const handleReset = useCallback(() => {
    editor.tf.setValue(initialValue);
    localStorage.removeItem("installation-next-demo");
    setHasContent(false);
    setExpanded(false);
    urlDetectedRef.current = false;
    onTextChange?.("");
    onHasContentChange?.(false);
  }, [editor, onTextChange, onHasContentChange]);

  // Expose reset to parent via ref
  useEffect(() => {
    if (onResetRef) {
      onResetRef.current = handleReset;
    }
  }, [onResetRef, handleReset]);

  // Expose setContent to parent via ref
  useEffect(() => {
    if (onSetContentRef) {
      onSetContentRef.current = (text: string) => {
        const lines = text.split("\n");
        const value: Value = lines.map((line) => ({
          children: [{ text: line }],
          type: "p",
        }));
        editor.tf.setValue(value);
        localStorage.setItem("installation-next-demo", JSON.stringify(value));
        const hasText = text.trim().length > 0;
        setHasContent(hasText);
        onHasContentChange?.(hasText);
        onTextChange?.(text);
        urlDetectedRef.current = false;
      };
    }
  }, [onSetContentRef, editor, onTextChange, onHasContentChange]);

  // Fire onTextChange on mount with saved text so the parent has the value
  useEffect(() => {
    const saved = localStorage.getItem("installation-next-demo");
    if (!saved) return;
    try {
      const value = JSON.parse(saved) as { children: { text?: string }[] }[];
      const plainText = value
        .flatMap((n: { children: { text?: string }[] }) => n.children)
        .map((c: { text?: string }) => c.text || "")
        .join(" ")
        .trim();
      if (plainText) {
        onTextChange?.(plainText);
        setHasContent(true);
      }
    } catch {
      // ignore parse errors
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Plate
      editor={editor}
      onChange={({ value }) => {
        localStorage.setItem("installation-next-demo", JSON.stringify(value));
        const text = value
          .flatMap((n: { children: { text?: string }[] }) => n.children)
          .some((c: { text?: string }) => c.text && c.text.trim().length > 0);
        setHasContent(text);
        onHasContentChange?.(text);

        // Extract plain text for parent
        const plainText = value
          .flatMap((n: { children: { text?: string }[] }) => n.children)
          .map((c: { text?: string }) => c.text || "")
          .join(" ")
          .trim();
        onTextChange?.(plainText);

        // Detect LinkedIn URL paste
        if (onUrlDetected && !urlDetectedRef.current) {
          const match = plainText.match(LINKEDIN_URL_RE);
          if (match) {
            urlDetectedRef.current = true;
            onUrlDetected(match[0]);
          }
        }
      }}
    >
      <div className="relative border">
        {/* Editor area with collapsible max-height */}
        <div
          ref={containerRef}
          className={cn(
            "min-h-[225px] overflow-hidden transition-[max-height] duration-300 ease-in-out",
            expanded ? "max-h-none" : "max-h-56",
          )}
        >
          <EditorContainer>
            <Editor placeholder="Paste a job description or LinkedIn URL..." />
          </EditorContainer>
        </div>

        {/* Gradient fade + expand/collapse button — only when content overflows */}
        {(isOverflowing || expanded) && (
          <>
            {!expanded && (
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-linear-to-t from-white to-transparent dark:from-black" />
            )}
            <button
              className="text-muted-foreground hover:text-foreground relative z-10 w-full cursor-pointer border-t py-2 text-center text-sm transition-colors"
              onClick={() => setExpanded(!expanded)}
              type="button"
            >
              {expanded ? "Collapse" : "Expand"}
            </button>
          </>
        )}
      </div>
    </Plate>
  );
}
