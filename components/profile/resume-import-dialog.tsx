"use client";

import { useCallback, useState } from "react";

import { FileIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Dropzone,
  DropZoneArea,
  DropzoneDescription,
  DropzoneTrigger,
  useDropzone,
} from "@/components/ui/dropzone";
import { categorizeSkills, type ContactField, type UserProfile } from "@/lib/profile";
import { cn } from "@/lib/utils";

interface ResumeImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  draft: UserProfile;
  onChange: (profile: UserProfile) => void;
}

interface ExtractedProfile {
  skills?: string[];
  experience?: UserProfile["experience"];
  education?: UserProfile["education"];
  projects?: UserProfile["projects"];
  certifications?: UserProfile["certifications"];
  full_name?: string;
  email?: string;
  phone?: string;
  location?: string;
  linkedin?: string;
  github?: string;
  website?: string;
  languages?: UserProfile["languages"];
}

// ── Merge multiple extracted profiles with dedup ────────────────────────────

function mergeExtractedProfiles(
  profiles: ExtractedProfile[],
): ExtractedProfile {
  const merged: ExtractedProfile = {};
  const skillSet = new Set<string>();
  const expSet = new Set<string>();
  const eduSet = new Set<string>();
  const projSet = new Set<string>();
  const certSet = new Set<string>();
  const langSet = new Set<string>();

  for (const p of profiles) {
    // Scalar fields: first non-empty wins
    if (!merged.full_name && p.full_name) merged.full_name = p.full_name;
    if (!merged.email && p.email) merged.email = p.email;
    if (!merged.phone && p.phone) merged.phone = p.phone;
    if (!merged.location && p.location) merged.location = p.location;
    if (!merged.linkedin && p.linkedin) merged.linkedin = p.linkedin;
    if (!merged.github && p.github) merged.github = p.github;
    if (!merged.website && p.website) merged.website = p.website;

    // Skills — dedup by lowercase
    if (p.skills?.length) {
      if (!merged.skills) merged.skills = [];
      for (const s of p.skills) {
        const key = s.trim().toLowerCase();
        if (key && !skillSet.has(key)) {
          skillSet.add(key);
          merged.skills.push(s.trim());
        }
      }
    }

    // Experience — dedup by company name (same company = same entry)
    if (p.experience?.length) {
      if (!merged.experience) merged.experience = [];
      for (const e of p.experience) {
        const key = e.company.toLowerCase().trim();
        if (key && !expSet.has(key)) {
          expSet.add(key);
          merged.experience.push(e);
        }
      }
    }

    // Education — dedup by degree+institution
    if (p.education?.length) {
      if (!merged.education) merged.education = [];
      for (const e of p.education) {
        const key = `${e.degree.toLowerCase()}|${e.institution.toLowerCase()}`;
        if (!eduSet.has(key)) {
          eduSet.add(key);
          merged.education.push(e);
        }
      }
    }

    // Projects — dedup by name
    if (p.projects?.length) {
      if (!merged.projects) merged.projects = [];
      for (const proj of p.projects) {
        const key = proj.name.toLowerCase();
        if (!projSet.has(key)) {
          projSet.add(key);
          merged.projects.push(proj);
        }
      }
    }

    // Certifications — dedup by name
    if (p.certifications?.length) {
      if (!merged.certifications) merged.certifications = [];
      for (const c of p.certifications) {
        const key = c.name.toLowerCase();
        if (!certSet.has(key)) {
          certSet.add(key);
          merged.certifications.push(c);
        }
      }
    }

    // Languages — dedup by language name
    if (p.languages?.length) {
      if (!merged.languages) merged.languages = [];
      for (const l of p.languages) {
        const key = l.language.toLowerCase();
        if (!langSet.has(key)) {
          langSet.add(key);
          merged.languages.push(l);
        }
      }
    }
  }

  return merged;
}

// ── Merge extracted data into the user's draft profile ──────────────────────

function applyImportToDraft(
  draft: UserProfile,
  preview: ExtractedProfile,
): UserProfile {
  const merged: UserProfile = { ...draft };

  // Merge contact fields from extracted data
  const extractedContacts: { id: string; type: "text" | "link"; label: string; value: string; url?: string }[] = [];
  if (preview.full_name) extractedContacts.push({ id: "full_name", type: "text", label: "Full Name", value: preview.full_name });
  if (preview.email) extractedContacts.push({ id: "email", type: "link", label: "Email", value: preview.email });
  if (preview.phone) extractedContacts.push({ id: "phone", type: "text", label: "Phone", value: preview.phone });
  if (preview.location) extractedContacts.push({ id: "location", type: "text", label: "Location", value: preview.location });
  if (preview.linkedin) extractedContacts.push({ id: "linkedin", type: "link", label: "LinkedIn", value: preview.linkedin, url: preview.linkedin });
  if (preview.github) extractedContacts.push({ id: "github", type: "link", label: "GitHub", value: preview.github, url: preview.github });
  if (preview.website) extractedContacts.push({ id: "website", type: "link", label: "Website", value: preview.website, url: preview.website });

  if (extractedContacts.length > 0) {
    const existingIds = new Set((merged.contact_fields ?? []).map((f) => f.id));
    const existingWithValues = new Set(
      (merged.contact_fields ?? []).filter((f) => f.value.trim()).map((f) => f.id),
    );
    const updatedFields: ContactField[] = [...(merged.contact_fields ?? [])];

    for (const ec of extractedContacts) {
      if (existingWithValues.has(ec.id)) continue; // don't overwrite filled fields
      if (existingIds.has(ec.id)) {
        // Update the empty existing field
        const idx = updatedFields.findIndex((f) => f.id === ec.id);
        if (idx !== -1) {
          updatedFields[idx] = { ...updatedFields[idx], value: ec.value, url: ec.url };
        }
      } else {
        // Add new field
        updatedFields.push({ ...ec, visible: true });
      }
    }
    merged.contact_fields = updatedFields;
  }

  // Also update legacy fields for backward compat
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

  // Categorize and merge skills into proper groups
  if (preview.skills?.length) {
    const existing = new Set<string>();
    for (const group of Object.values(merged.skills)) {
      for (const s of group) existing.add(s.toLowerCase());
    }
    const newSkills = preview.skills.filter(
      (s) => s.trim() && !existing.has(s.trim().toLowerCase()),
    );
    if (newSkills.length > 0) {
      const categorized = categorizeSkills(newSkills);
      const updatedSkills = { ...merged.skills };
      for (const [category, skills] of Object.entries(categorized)) {
        updatedSkills[category] = [
          ...(updatedSkills[category] ?? []),
          ...skills,
        ];
      }
      merged.skills = updatedSkills;
    }
  }
  if (preview.experience?.length) {
    const existingCompanies = new Set(
      merged.experience.map((e) => e.company.toLowerCase().trim()),
    );
    const newExps = preview.experience.filter(
      (e) => !existingCompanies.has(e.company.toLowerCase().trim()),
    );
    merged.experience = [...merged.experience, ...newExps];
  }
  if (preview.education?.length) {
    const existingEdu = new Set(
      merged.education.map(
        (e) => `${e.degree.toLowerCase()}|${e.institution.toLowerCase()}`,
      ),
    );
    const newEdus = preview.education.filter(
      (e) =>
        !existingEdu.has(
          `${e.degree.toLowerCase()}|${e.institution.toLowerCase()}`,
        ),
    );
    merged.education = [...merged.education, ...newEdus];
  }
  if (preview.projects?.length) {
    const existingProjects = new Set(
      (merged.projects ?? []).map((p) => p.name.toLowerCase().trim()),
    );
    const newProjects = preview.projects.filter(
      (p) => !existingProjects.has(p.name.toLowerCase().trim()),
    );
    merged.projects = [...(merged.projects ?? []), ...newProjects];
  }
  if (preview.certifications?.length) {
    const existingCerts = new Set(
      (merged.certifications ?? []).map((c) => c.name.toLowerCase().trim()),
    );
    const newCerts = preview.certifications.filter(
      (c) => !existingCerts.has(c.name.toLowerCase().trim()),
    );
    merged.certifications = [...(merged.certifications ?? []), ...newCerts];
  }
  if (preview.languages?.length) {
    merged.languages = [...(merged.languages ?? []), ...preview.languages];
  }

  return merged;
}

// ── Component ───────────────────────────────────────────────────────────────

export function ResumeImportDialog({
  open,
  onOpenChange,
  draft,
  onChange,
}: ResumeImportDialogProps) {
  const [isExtracting, setIsExtracting] = useState(false);
  const [progress, setProgress] = useState("");
  const [preview, setPreview] = useState<ExtractedProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDrop = useCallback(async (file: File) => {
    // Dropzone calls this per-file; we handle batch in handleFiles instead.
    // Return success so the dropzone doesn't show error state.
    return { status: "success" as const, result: file.name };
  }, []);

  const dropzone = useDropzone<string>({
    onDropFile: handleDrop,
    validation: {
      accept: { "application/pdf": [".pdf"] },
      maxFiles: 10,
      maxSize: 10 * 1024 * 1024,
    },
  });

  // Process all dropped files
  const handleFiles = useCallback(async (files: File[]) => {
    if (!files.length) return;

    setIsExtracting(true);
    setError(null);
    setPreview(null);
    setProgress(`Parsing ${files.length} PDF${files.length > 1 ? "s" : ""}...`);

    try {
      // Step 1: Parse all PDFs
      const formData = new FormData();
      for (const file of files) {
        formData.append("files", file);
      }
      const parseRes = await fetch("/api/parse-pdf", {
        method: "POST",
        body: formData,
      });
      if (!parseRes.ok) throw new Error("Failed to parse PDFs");
      const parseData = (await parseRes.json()) as {
        results: { text: string; fileName: string }[];
      };

      const validResults = parseData.results.filter((r) => r.text.trim());
      if (!validResults.length)
        throw new Error("No text could be extracted from the PDFs");

      // Step 2: Extract profile data from each in parallel
      const extractedProfiles: ExtractedProfile[] = [];
      let completed = 0;

      await Promise.all(
        validResults.map(async (result) => {
          const extractRes = await fetch("/api/extract-profile", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ resumeText: result.text }),
          });
          if (extractRes.ok) {
            const extracted = (await extractRes.json()) as ExtractedProfile;
            extractedProfiles.push(extracted);
          }
          completed++;
          setProgress(
            `Extracting data... ${completed}/${validResults.length}`,
          );
        }),
      );

      if (!extractedProfiles.length)
        throw new Error("Failed to extract data from any resume");

      // Step 3: Merge all extracted profiles
      const merged = mergeExtractedProfiles(extractedProfiles);
      setPreview(merged);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to import resumes",
      );
    } finally {
      setIsExtracting(false);
      setProgress("");
    }
  }, []);

  const handleConfirm = () => {
    if (!preview) return;
    const updated = applyImportToDraft(draft, preview);
    onChange(updated);
    setPreview(null);
    onOpenChange(false);
  };

  const handleCancel = () => {
    setPreview(null);
    setError(null);
    setProgress("");
    setIsExtracting(false);
  };

  const previewCounts = preview
    ? {
        skills: preview.skills?.length ?? 0,
        experience: preview.experience?.length ?? 0,
        education: preview.education?.length ?? 0,
        projects: preview.projects?.length ?? 0,
        certifications: preview.certifications?.length ?? 0,
        languages: preview.languages?.length ?? 0,
      }
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import from Resume PDFs</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!preview && (
            <Dropzone {...dropzone}>
              <DropZoneArea
                className={cn(
                  "flex-col gap-3 px-8 py-8",
                  !error && "border-input",
                )}
              >
                <div className="flex flex-col items-center text-center">
                  <HugeiconsIcon
                    icon={FileIcon}
                    className="text-muted-foreground mb-2 size-6"
                  />
                  {isExtracting ? (
                    <div className="space-y-2">
                      <div className="border-primary mx-auto size-5 animate-spin rounded-full border-2 border-t-transparent" />
                      <p className="text-muted-foreground text-xs">
                        {progress}
                      </p>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm font-medium">
                        Drop your resume PDFs here
                      </p>
                      <DropzoneDescription>
                        Up to 10 PDFs · 10MB each · Data extracted and PDFs
                        discarded
                      </DropzoneDescription>
                      <DropzoneTrigger className="text-primary hover:text-primary/80 mt-1 bg-transparent px-4 py-1.5 text-sm font-medium transition-colors">
                        Browse files
                      </DropzoneTrigger>
                    </>
                  )}
                </div>
              </DropZoneArea>
            </Dropzone>
          )}

          {/* Process button — shown after files are selected but before processing */}
          {!preview &&
            !isExtracting &&
            dropzone.fileStatuses.length > 0 && (
              <div className="space-y-2">
                <p className="text-muted-foreground text-xs">
                  {dropzone.fileStatuses.length} file
                  {dropzone.fileStatuses.length > 1 ? "s" : ""} selected
                </p>
                <Button
                  size="sm"
                  onClick={() => {
                    const files = dropzone.fileStatuses.map(
                      (fs) => fs.file,
                    );
                    handleFiles(files);
                  }}
                >
                  Extract Profile Data
                </Button>
              </div>
            )}

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
                {previewCounts.certifications > 0 && (
                  <span className="text-muted-foreground">
                    <span className="text-foreground font-medium">
                      {previewCounts.certifications}
                    </span>{" "}
                    certifications
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
                This will be merged with your existing profile data. Existing
                fields are not overwritten.
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
                  onClick={handleCancel}
                  className="text-xs"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
