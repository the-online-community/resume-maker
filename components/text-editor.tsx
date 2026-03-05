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
import { useEffect, useRef, useState } from "react";

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
}: {
  onTextChange?: (text: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [hasContent, setHasContent] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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

        // Extract plain text for parent
        const plainText = value
          .flatMap((n: { children: { text?: string }[] }) => n.children)
          .map((c: { text?: string }) => c.text || "")
          .join(" ")
          .trim();
        onTextChange?.(plainText);
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
            <Editor placeholder="Paste your job description here..." />
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
