"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { AiSectionEditor } from "@/components/resume/ai-section-editor";
import { LinkEditPopover, toUrl } from "@/components/resume/link-edit-popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { RESUME_CSS } from "@/lib/resume/resume-styles";
import type { ContactField } from "@/lib/profile";
import {
  DEFAULT_SETTINGS,
  type TemplateSettings,
} from "@/lib/resume/templates";

interface ResumeContentProps {
  placeholders: Record<string, string>;
  isStreaming?: boolean;
  onEdit?: (key: string, value: string) => void;
  onBatchEdit?: (updates: Record<string, string>) => void;
  jobDescription?: string;
  templateSettings?: TemplateSettings;
  contactFields?: ContactField[];
  highlightKeywords?: string[];
}

const BULLET_CHARS: Record<TemplateSettings["bulletStyle"], string> = {
  dot: "•",
  dash: "—",
};

/**
 * Format experience text as HTML for contentEditable.
 * Lines starting with bullets become plain divs; others are bolded.
 */
function experienceToHtml(
  text: string,
  boldLabels: boolean,
  bulletStyle: TemplateSettings["bulletStyle"],
) {
  const bulletChar = BULLET_CHARS[bulletStyle];

  // Split into role blocks separated by blank lines
  const blocks: string[][] = [];
  let current: string[] = [];
  for (const line of text.split("\n")) {
    if (!line.trim()) {
      if (current.length) {
        blocks.push(current);
        current = [];
      }
    } else {
      current.push(line);
    }
  }
  if (current.length) blocks.push(current);

  return blocks
    .map((lines) => {
      const inner = lines
        .map((line, i) => {
          const trimmed = line.trim();
          const isBullet = /^[•\-—*]/.test(trimmed);
          if (isBullet) {
            const content = trimmed.replace(/^[•\-—*]\s*/, `${bulletChar} `);
            return `<div>${escapeHtml(content)}</div>`;
          }
          if (i === 0 && boldLabels) {
            return `<div style="font-weight:600">${escapeHtml(line)}</div>`;
          }
          return `<div>${escapeHtml(line)}</div>`;
        })
        .join("");
      return `<div class="resume-entry">${inner}</div>`;
    })
    .join("");
}

function escapeHtml(str: string) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// ── Header contact field renderers ──

function HeaderLink({
  fieldKey,
  placeholders,
  editable,
  onSave,
}: {
  fieldKey: string;
  placeholders: Record<string, string>;
  editable: boolean;
  onSave: (key: string, label: string, url: string) => void;
}) {
  const label = placeholders[fieldKey];
  const urlKey = `${fieldKey}_URL`;
  const defaultUrl =
    fieldKey === "EMAIL"
      ? `mailto:${label}`
      : toUrl(label);
  const url = placeholders[urlKey] || defaultUrl;

  if (!label) return null;

  return (
    <span className="resume-contact-item">
      {editable ? (
        <LinkEditPopover
          label={label}
          url={url}
          onSave={(lbl, href) => onSave(fieldKey, lbl, href)}
        />
      ) : (
        <a
          className="resume-link"
          href={url}
          target={fieldKey === "EMAIL" ? undefined : "_blank"}
          rel={fieldKey === "EMAIL" ? undefined : "noopener noreferrer"}
        >
          {label}
        </a>
      )}
    </span>
  );
}

function HeaderText({
  fieldKey,
  placeholders,
  editable,
  onBlur,
}: {
  fieldKey: string;
  placeholders: Record<string, string>;
  editable: boolean;
  onBlur: (key: string) => (e: React.FocusEvent<HTMLElement>) => void;
}) {
  const value = placeholders[fieldKey];
  if (!value) return null;

  return (
    <span className="resume-contact-item">
      <span
        contentEditable={editable}
        suppressContentEditableWarning
        onBlur={onBlur(fieldKey)}
        className={editable ? "resume-editable" : undefined}
      >
        {value}
      </span>
    </span>
  );
}

// ── Add new header item ──

function AddHeaderItem({
  placeholders,
  onAdd,
}: {
  placeholders: Record<string, string>;
  onAdd: (key: string, value: string, url?: string) => void;
}) {
  const [addingText, setAddingText] = useState(false);
  const [textValue, setTextValue] = useState("");

  const getNextKey = () => {
    let i = 1;
    while (placeholders[`CUSTOM_${i}`]) i++;
    return `CUSTOM_${i}`;
  };

  const handleAddLink = () => {
    const key = getNextKey();
    onAdd(key, "Link", "https://");
  };

  const handleAddText = () => {
    if (!textValue.trim()) return;
    const key = getNextKey();
    onAdd(key, textValue.trim());
    setTextValue("");
    setAddingText(false);
  };

  if (addingText) {
    return (
      <span className="resume-contact-item">
        <span className="inline-flex items-center gap-1">
          <Input
            value={textValue}
            onChange={(e) => setTextValue(e.target.value)}
            placeholder="Text value"
            className="h-5 w-24 border-none bg-transparent px-0 text-inherit shadow-none outline-none focus-visible:ring-0"
            style={{ fontSize: "inherit", lineHeight: "inherit" }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddText();
              }
              if (e.key === "Escape") {
                setTextValue("");
                setAddingText(false);
              }
            }}
            autoFocus
          />
          <button
            type="button"
            onClick={handleAddText}
            className="cursor-pointer text-green-600 hover:text-green-700"
            style={{ fontSize: "inherit", lineHeight: "inherit" }}
          >
            ✓
          </button>
          <button
            type="button"
            onClick={() => {
              setTextValue("");
              setAddingText(false);
            }}
            className="text-muted-foreground hover:text-foreground cursor-pointer"
            style={{ fontSize: "inherit", lineHeight: "inherit" }}
          >
            ✕
          </button>
        </span>
      </span>
    );
  }

  return (
    <span className="resume-contact-item">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
            style={{ fontSize: "inherit", lineHeight: "inherit" }}
            title="Add header item"
          >
            +
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-[120px]">
          <DropdownMenuItem onClick={() => setAddingText(true)}>
            Add Text
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleAddLink}>
            Add Link
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </span>
  );
}

// ── Link fields vs text-only fields ──

const LINK_FIELDS = new Set(["EMAIL", "LINKEDIN", "GITHUB", "WEBSITE"]);

/** The actual resume sections — rendered once per visual page (cheap, just text). */
export function ResumeContent({
  placeholders,
  isStreaming,
  onEdit,
  onBatchEdit,
  jobDescription,
  templateSettings,
  contactFields,
  highlightKeywords,
}: ResumeContentProps) {
  const settings = templateSettings || DEFAULT_SETTINGS;
  const editable = !isStreaming && !!onEdit;

  // Track whether the last change came from the user (to skip overwriting their edits)
  const userEditedRef = useRef(false);

  const handleBlur = (key: string) => (e: React.FocusEvent<HTMLElement>) => {
    // Normalize: collapse 3+ consecutive newlines into 2 (prevents accumulation from div/br rendering)
    const text = e.currentTarget.innerText.trim().replace(/\n{3,}/g, "\n\n");
    if (text !== placeholders[key]) {
      userEditedRef.current = true;
      onEdit?.(key, text);
    }
  };

  const handleLinkSave = (key: string, label: string, url: string) => {
    if (onBatchEdit) {
      onBatchEdit({ [key]: label, [`${key}_URL`]: url });
    } else {
      onEdit?.(key, label);
      onEdit?.(`${key}_URL`, url);
    }
  };

  /**
   * Ref callback for the EXPERIENCE contentEditable div.
   * Sets innerHTML directly (once) so React never manages children inside it.
   */
  const experienceRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (!node) return;
      // Only update innerHTML when the change came from outside (AI, streaming)
      if (userEditedRef.current) {
        userEditedRef.current = false;
        return;
      }
      node.innerHTML = experienceToHtml(
        placeholders.EXPERIENCE || "",
        settings.boldLabels,
        settings.bulletStyle,
      );
    },
    [placeholders.EXPERIENCE, settings.boldLabels, settings.bulletStyle],
  );

  // ── Section heading style ──

  const h2Style: React.CSSProperties | undefined = settings.boldLabels
    ? undefined
    : { fontWeight: 400 };

  // ── Section renderers ──

  function renderSection(sectionKey: string) {
    const content = placeholders[sectionKey];
    if (!content) return null;

    if (sectionKey === "EXPERIENCE") {
      return (
        <AiSectionEditor
          key={sectionKey}
          sectionKey="EXPERIENCE"
          currentContent={content}
          jobDescription={jobDescription}
          editable={editable}
          onAccept={(val: string) => onEdit?.("EXPERIENCE", val)}
        >
          <section className="resume-section">
            <h2 style={h2Style}>Experience</h2>
            <div
              ref={experienceRef}
              contentEditable={editable}
              suppressContentEditableWarning
              onBlur={handleBlur("EXPERIENCE")}
              className={editable ? "resume-editable" : undefined}
            />
          </section>
        </AiSectionEditor>
      );
    }

    // Generic section (SUMMARY, EDUCATION, SKILLS, CERTIFICATIONS)
    const label =
      sectionKey === "SUMMARY"
        ? "Summary"
        : sectionKey === "EDUCATION"
          ? "Education"
          : sectionKey === "SKILLS"
            ? "Skills"
            : sectionKey === "CERTIFICATIONS"
              ? "Certifications"
              : sectionKey;

    const Tag = sectionKey === "SUMMARY" || sectionKey === "SKILLS" ? "p" : "div";

    return (
      <AiSectionEditor
        key={sectionKey}
        sectionKey={sectionKey}
        currentContent={content}
        jobDescription={jobDescription}
        editable={editable}
        onAccept={(val: string) => onEdit?.(sectionKey, val)}
      >
        <section className="resume-section">
          <h2 style={h2Style}>{label}</h2>
          <Tag
            contentEditable={editable}
            suppressContentEditableWarning
            onBlur={handleBlur(sectionKey)}
            className={editable ? "resume-editable" : undefined}
          >
            {content}
          </Tag>
        </section>
      </AiSectionEditor>
    );
  }

  const resumeRootRef = useRef<HTMLDivElement>(null);

  // ── Keyword highlighting ──

  useEffect(() => {
    const root = resumeRootRef.current;
    if (!root || !highlightKeywords?.length) return;

    // Build a single regex matching all keywords (case-insensitive, whole-ish word)
    const escaped = highlightKeywords
      .filter((k) => k.length >= 2)
      .map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    if (!escaped.length) return;

    const re = new RegExp(`\\b(${escaped.join("|")})\\b`, "gi");

    // Walk all text nodes inside resume-section elements
    const sections = root.querySelectorAll(".resume-section");
    const marks: HTMLElement[] = [];

    for (const section of sections) {
      const walker = document.createTreeWalker(section, NodeFilter.SHOW_TEXT);
      const textNodes: Text[] = [];
      let node: Text | null;
      while ((node = walker.nextNode() as Text | null)) {
        textNodes.push(node);
      }

      for (const textNode of textNodes) {
        const text = textNode.textContent || "";
        if (!re.test(text)) continue;
        re.lastIndex = 0;

        // Split text around matches and create mark elements
        const frag = document.createDocumentFragment();
        let lastIndex = 0;
        let match: RegExpExecArray | null;

        while ((match = re.exec(text)) !== null) {
          // Text before match
          if (match.index > lastIndex) {
            frag.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
          }
          // Highlighted match
          const mark = document.createElement("mark");
          mark.className = "resume-keyword-highlight";
          mark.textContent = match[0];
          frag.appendChild(mark);
          marks.push(mark);
          lastIndex = re.lastIndex;
        }
        // Text after last match
        if (lastIndex < text.length) {
          frag.appendChild(document.createTextNode(text.slice(lastIndex)));
        }

        textNode.parentNode?.replaceChild(frag, textNode);
      }
    }

    // Cleanup: remove marks on next render cycle
    return () => {
      for (const mark of marks) {
        const parent = mark.parentNode;
        if (parent) {
          parent.replaceChild(document.createTextNode(mark.textContent || ""), mark);
          parent.normalize(); // merge adjacent text nodes
        }
      }
    };
  }, [highlightKeywords, placeholders]);

  return (
    <>
      {/* Shared resume styles */}
      <style>{RESUME_CSS}</style>
      {highlightKeywords?.length ? (
        <style>{`
          .resume-keyword-highlight {
            background: rgba(250, 204, 21, 0.25);
            color: inherit;
            padding: 0;
            border-bottom: 1.5px solid rgb(250, 204, 21);
          }
          @media (prefers-color-scheme: dark) {
            .resume-keyword-highlight {
              background: rgba(250, 204, 21, 0.15);
              border-bottom-color: rgba(250, 204, 21, 0.5);
            }
          }
        `}</style>
      ) : null}
      <div ref={resumeRootRef} style={{ position: 'relative' }}>

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
            className={`resume-job-title${editable ? " resume-editable" : ""}`}
            contentEditable={editable}
            suppressContentEditableWarning
            onBlur={handleBlur("JOB_TITLE")}
          >
            {placeholders.JOB_TITLE}
          </p>
        )}
        <div className="resume-contact">
         <div className="resume-contact-inner">
          {contactFields && contactFields.length > 0
            ? /* ── Dynamic contact fields from profile ── */
              contactFields
                .filter((cf) => cf.visible && cf.value && cf.id !== "full_name" && cf.label.toLowerCase() !== "full name")
                .map((cf) => {
                  // Map contact field to placeholder key for rendering
                  const fieldKey = `CF_${cf.id}`;
                  if (cf.type === "link") {
                    // Inject into placeholders so HeaderLink can read them
                    const p = {
                      ...placeholders,
                      [fieldKey]: cf.value,
                      [`${fieldKey}_URL`]:
                        cf.url ||
                        (cf.label.toLowerCase() === "email"
                          ? `mailto:${cf.value}`
                          : toUrl(cf.value)),
                    };
                    return (
                      <HeaderLink
                        key={cf.id}
                        fieldKey={fieldKey}
                        placeholders={p}
                        editable={editable}
                        onSave={handleLinkSave}
                      />
                    );
                  }
                  const p = { ...placeholders, [fieldKey]: cf.value };
                  return (
                    <HeaderText
                      key={cf.id}
                      fieldKey={fieldKey}
                      placeholders={p}
                      editable={editable}
                      onBlur={handleBlur}
                    />
                  );
                })
            : /* ── Legacy: header fields from template settings ── */
              <>
                {settings.headerFields.map((fieldKey) =>
                  LINK_FIELDS.has(fieldKey) ? (
                    <HeaderLink
                      key={fieldKey}
                      fieldKey={fieldKey}
                      placeholders={placeholders}
                      editable={editable}
                      onSave={handleLinkSave}
                    />
                  ) : (
                    <HeaderText
                      key={fieldKey}
                      fieldKey={fieldKey}
                      placeholders={placeholders}
                      editable={editable}
                      onBlur={handleBlur}
                    />
                  ),
                )}
                {/* Custom user-added header items */}
                {Object.keys(placeholders)
                  .filter((k) => k.startsWith("CUSTOM_") && !k.endsWith("_URL"))
                  .map((fieldKey) =>
                    placeholders[`${fieldKey}_URL`] ? (
                      <HeaderLink
                        key={fieldKey}
                        fieldKey={fieldKey}
                        placeholders={placeholders}
                        editable={editable}
                        onSave={handleLinkSave}
                      />
                    ) : (
                      <HeaderText
                        key={fieldKey}
                        fieldKey={fieldKey}
                        placeholders={placeholders}
                        editable={editable}
                        onBlur={handleBlur}
                      />
                    ),
                  )}
                {/* Add new header item button */}
                {editable && (
                  <AddHeaderItem
                    placeholders={placeholders}
                    onAdd={(key, value, url) => {
                      if (onBatchEdit) {
                        const updates: Record<string, string> = { [key]: value };
                        if (url) updates[`${key}_URL`] = url;
                        onBatchEdit(updates);
                      } else {
                        onEdit?.(key, value);
                        if (url) onEdit?.(`${key}_URL`, url);
                      }
                    }}
                  />
                )}
              </>
          }
         </div>
        </div>
      </div>

      {/* Sections — rendered in user-configured order */}
      {settings.sections.map(renderSection)}

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
      </div>
    </>
  );
}
