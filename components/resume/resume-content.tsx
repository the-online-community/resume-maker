"use client";

import { useCallback, useRef } from "react";

import { AiSectionEditor } from "@/components/resume/ai-section-editor";
import { LinkEditPopover, toUrl } from "@/components/resume/link-edit-popover";
import { Skeleton } from "@/components/ui/skeleton";
import { RESUME_CSS } from "@/lib/resume/resume-styles";
import {
  DEFAULT_SETTINGS,
  type TemplateSettings,
} from "@/lib/resume/templates";

interface ResumeContentProps {
  placeholders: Record<string, string>;
  isStreaming?: boolean;
  onEdit?: (key: string, value: string) => void;
  jobDescription?: string;
  templateSettings?: TemplateSettings;
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
  let isFirstRoleLine = true;
  return text
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) {
        // Blank line = role separator, next non-bullet line is a new role title
        isFirstRoleLine = true;
        return "<br>";
      }
      const isBullet = /^[•\-—*]/.test(trimmed);
      if (isBullet) {
        const content = trimmed.replace(/^[•\-—*]\s*/, `${bulletChar} `);
        return `<div>${escapeHtml(content)}</div>`;
      }
      // Non-bullet line: bold only the first one per role block (job title)
      if (isFirstRoleLine && boldLabels) {
        isFirstRoleLine = false;
        return `<div style="font-weight:600">${escapeHtml(line)}</div>`;
      }
      isFirstRoleLine = false;
      return `<div>${escapeHtml(line)}</div>`;
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

// ── Link fields vs text-only fields ──

const LINK_FIELDS = new Set(["EMAIL", "LINKEDIN", "GITHUB", "WEBSITE"]);

/** The actual resume sections — rendered once per visual page (cheap, just text). */
export function ResumeContent({
  placeholders,
  isStreaming,
  onEdit,
  jobDescription,
  templateSettings,
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
    onEdit?.(key, label);
    onEdit?.(`${key}_URL`, url);
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
            className={`resume-job-title${editable ? " resume-editable" : ""}`}
            contentEditable={editable}
            suppressContentEditableWarning
            onBlur={handleBlur("JOB_TITLE")}
          >
            {placeholders.JOB_TITLE}
          </p>
        )}
        <div className="resume-contact">
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
    </>
  );
}
