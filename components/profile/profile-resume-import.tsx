"use client";

import { FileIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useCallback, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dropzone,
  DropZoneArea,
  DropzoneDescription,
  DropzoneTrigger,
  useDropzone,
} from "@/components/ui/dropzone";
import type { UserProfile } from "@/lib/profile";

interface ProfileResumeImportProps {
  draft: UserProfile;
  onChange: (profile: UserProfile) => void;
  model?: string;
}

interface ExtractedProfile {
  skills?: string[];
  experience?: UserProfile["experience"];
  education?: UserProfile["education"];
  projects?: UserProfile["projects"];
  full_name?: string;
  email?: string;
  phone?: string;
  location?: string;
  linkedin?: string;
  github?: string;
  website?: string;
  languages?: UserProfile["languages"];
}

export function ProfileResumeImport({
  draft,
  onChange,
  model,
}: ProfileResumeImportProps) {
  const [isExtracting, setIsExtracting] = useState(false);
  const [preview, setPreview] = useState<ExtractedProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDrop = useCallback(
    async (file: File) => {
      setIsExtracting(true);
      setError(null);
      setPreview(null);

      try {
        // Step 1: Parse PDF
        const formData = new FormData();
        formData.append("files", file);
        const parseRes = await fetch("/api/parse-pdf", {
          method: "POST",
          body: formData,
        });
        if (!parseRes.ok) throw new Error("Failed to parse PDF");
        const parseData = (await parseRes.json()) as {
          results: { text: string }[];
        };
        const resumeText = parseData.results[0]?.text;
        if (!resumeText) throw new Error("No text extracted from PDF");

        // Step 2: Extract profile data via AI
        const extractRes = await fetch("/api/extract-profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resumeText, model }),
        });
        if (!extractRes.ok) throw new Error("Failed to extract profile data");
        const extracted = (await extractRes.json()) as ExtractedProfile;

        setPreview(extracted);
      } catch {
        setError("Failed to import resume. Please try again.");
      } finally {
        setIsExtracting(false);
      }

      return { status: "success" as const, result: "done" };
    },
    [model],
  );

  const dropzone = useDropzone<string>({
    onDropFile: handleDrop,
    validation: {
      accept: { "application/pdf": [".pdf"] },
      maxFiles: 1,
      maxSize: 10 * 1024 * 1024,
    },
  });

  const handleConfirm = () => {
    if (!preview) return;

    const merged: UserProfile = { ...draft };

    // Merge scalar fields only if currently empty
    if (!merged.full_name && preview.full_name)
      merged.full_name = preview.full_name;
    if (!merged.email && preview.email) merged.email = preview.email;
    if (!merged.phone && preview.phone) merged.phone = preview.phone;
    if (!merged.location && preview.location)
      merged.location = preview.location;
    if (!merged.linkedin && preview.linkedin)
      merged.linkedin = preview.linkedin;
    if (!merged.github && preview.github) merged.github = preview.github;
    if (!merged.website && preview.website) merged.website = preview.website;

    // Append arrays
    if (preview.skills?.length) {
      const existing = new Set(merged.skills.map((s) => s.toLowerCase()));
      const newSkills = preview.skills.filter(
        (s) => !existing.has(s.toLowerCase()),
      );
      merged.skills = [...merged.skills, ...newSkills];
    }
    if (preview.experience?.length) {
      merged.experience = [...merged.experience, ...preview.experience];
    }
    if (preview.education?.length) {
      merged.education = [...merged.education, ...preview.education];
    }
    if (preview.projects?.length) {
      merged.projects = [...(merged.projects ?? []), ...preview.projects];
    }
    if (preview.languages?.length) {
      merged.languages = [...(merged.languages ?? []), ...preview.languages];
    }

    onChange(merged);
    setPreview(null);
  };

  const previewCounts = preview
    ? {
        skills: preview.skills?.length ?? 0,
        experience: preview.experience?.length ?? 0,
        education: preview.education?.length ?? 0,
        projects: preview.projects?.length ?? 0,
        languages: preview.languages?.length ?? 0,
      }
    : null;

  return (
    <div className="space-y-4">
      <Dropzone {...dropzone}>
        <DropZoneArea className="flex-col gap-3 px-8 py-8">
          <div className="flex flex-col items-center text-center">
            <HugeiconsIcon
              icon={FileIcon}
              className="text-muted-foreground mb-2 size-6"
            />
            {isExtracting ? (
              <div className="space-y-2">
                <div className="border-primary mx-auto size-5 animate-spin rounded-full border-2 border-t-transparent" />
                <p className="text-muted-foreground text-xs">
                  Extracting profile data from resume...
                </p>
              </div>
            ) : (
              <>
                <p className="text-sm font-medium">
                  Drop a resume PDF to import
                </p>
                <DropzoneDescription>
                  PDF only · Up to 10MB · Data extracted and PDF discarded
                </DropzoneDescription>
                <DropzoneTrigger className="text-primary hover:text-primary/80 mt-1 bg-transparent px-4 py-1.5 text-sm font-medium transition-colors">
                  Browse files
                </DropzoneTrigger>
              </>
            )}
          </div>
        </DropZoneArea>
      </Dropzone>

      {error && <p className="text-destructive text-xs">{error}</p>}

      {previewCounts && (
        <div className="space-y-3 border p-3">
          <h4 className="text-sm font-medium">Extracted Data</h4>
          <div className="flex flex-wrap gap-3 text-xs">
            {previewCounts.skills > 0 && (
              <span className="text-muted-foreground">
                <span className="text-foreground font-medium">
                  {previewCounts.skills}
                </span>{" "}
                skills
              </span>
            )}
            {previewCounts.experience > 0 && (
              <span className="text-muted-foreground">
                <span className="text-foreground font-medium">
                  {previewCounts.experience}
                </span>{" "}
                experience
              </span>
            )}
            {previewCounts.education > 0 && (
              <span className="text-muted-foreground">
                <span className="text-foreground font-medium">
                  {previewCounts.education}
                </span>{" "}
                education
              </span>
            )}
            {previewCounts.projects > 0 && (
              <span className="text-muted-foreground">
                <span className="text-foreground font-medium">
                  {previewCounts.projects}
                </span>{" "}
                projects
              </span>
            )}
            {previewCounts.languages > 0 && (
              <span className="text-muted-foreground">
                <span className="text-foreground font-medium">
                  {previewCounts.languages}
                </span>{" "}
                languages
              </span>
            )}
          </div>
          <p className="text-muted-foreground text-xs">
            This will be merged with your existing profile data. Existing fields
            are not overwritten.
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleConfirm}
              className="bg-green-600 text-xs hover:bg-green-700"
            >
              Confirm Import
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPreview(null)}
              className="text-xs"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
