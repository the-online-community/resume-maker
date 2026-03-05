"use client";

import { AiSectionEditor } from "@/components/resume/ai-section-editor";
import { LinkEditPopover, toUrl } from "@/components/resume/link-edit-popover";
import { Skeleton } from "@/components/ui/skeleton";
import { RESUME_CSS } from "@/lib/resume/resume-styles";

interface ResumeContentProps {
  placeholders: Record<string, string>;
  isStreaming?: boolean;
  onEdit?: (key: string, value: string) => void;
  jobDescription?: string;
}

/** The actual resume sections — rendered once per visual page (cheap, just text). */
export function ResumeContent({
  placeholders,
  isStreaming,
  onEdit,
  jobDescription,
}: ResumeContentProps) {
  const editable = !isStreaming && !!onEdit;

  const handleBlur = (key: string) => (e: React.FocusEvent<HTMLElement>) => {
    // Normalize: collapse 3+ consecutive newlines into 2 (prevents accumulation from div/br rendering)
    const text = e.currentTarget.innerText.trim().replace(/\n{3,}/g, "\n\n");
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
          onAccept={(val: string) => onEdit?.("SUMMARY", val)}
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
          onAccept={(val: string) => onEdit?.("EXPERIENCE", val)}
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
        <AiSectionEditor
          sectionKey="EDUCATION"
          currentContent={placeholders.EDUCATION}
          jobDescription={jobDescription}
          editable={editable}
          onAccept={(val: string) => onEdit?.("EDUCATION", val)}
        >
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
        </AiSectionEditor>
      )}

      {/* Skills */}
      {placeholders.SKILLS && (
        <AiSectionEditor
          sectionKey="SKILLS"
          currentContent={placeholders.SKILLS}
          jobDescription={jobDescription}
          editable={editable}
          onAccept={(val: string) => onEdit?.("SKILLS", val)}
        >
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
        </AiSectionEditor>
      )}

      {/* Certifications */}
      {placeholders.CERTIFICATIONS && (
        <AiSectionEditor
          sectionKey="CERTIFICATIONS"
          currentContent={placeholders.CERTIFICATIONS}
          jobDescription={jobDescription}
          editable={editable}
          onAccept={(val: string) => onEdit?.("CERTIFICATIONS", val)}
        >
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
        </AiSectionEditor>
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
