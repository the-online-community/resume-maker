"use client";

import { Cancel01Icon, PlusSignIcon, UserCircleIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useCallback, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  EMPTY_PROFILE,
  type EducationEntry,
  type ExperienceEntry,
  type ProjectEntry,
  type UserProfile,
} from "@/lib/profile";

interface UserProfileDialogProps {
  profile: UserProfile;
  onSave: (profile: UserProfile) => Promise<void>;
  isSaving?: boolean;
  disabled?: boolean;
  hasProfile?: boolean;
}

export function UserProfileDialog({
  profile,
  onSave,
  isSaving,
  disabled,
  hasProfile,
}: UserProfileDialogProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<UserProfile>(profile);
  // Keep the raw textarea string separate so commas/spaces aren't eaten
  const [skillsText, setSkillsText] = useState(profile.skills.join(", "));

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (next) {
        setDraft({ ...EMPTY_PROFILE, ...profile });
        setSkillsText(profile.skills.join(", "));
      }
      setOpen(next);
    },
    [profile],
  );

  const handleSave = useCallback(async () => {
    await onSave(draft);
    setOpen(false);
  }, [draft, onSave]);

  // ── Skills helpers ─────────────────────────────────────────────────────────

  const handleSkillsChange = (raw: string) => {
    setSkillsText(raw);
    // Parse into the array only for saving — don't re-derive the textarea value
    const parsed = raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    setDraft((d) => ({ ...d, skills: parsed }));
  };

  // ── Experience helpers ─────────────────────────────────────────────────────

  const addExperience = () =>
    setDraft((d) => ({
      ...d,
      experience: [
        ...d.experience,
        { title: "", company: "", location: "", start_date: "", end_date: "" },
      ],
    }));

  const updateExperience = (
    i: number,
    field: keyof ExperienceEntry,
    value: string,
  ) =>
    setDraft((d) => {
      const updated = [...d.experience];
      updated[i] = { ...updated[i], [field]: value };
      return { ...d, experience: updated };
    });

  const removeExperience = (i: number) =>
    setDraft((d) => ({
      ...d,
      experience: d.experience.filter((_, idx) => idx !== i),
    }));

  // ── Education helpers ──────────────────────────────────────────────────────

  const addEducation = () =>
    setDraft((d) => ({
      ...d,
      education: [...d.education, { degree: "", institution: "", year: "" }],
    }));

  const updateEducation = (
    i: number,
    field: keyof EducationEntry,
    value: string,
  ) =>
    setDraft((d) => {
      const updated = [...d.education];
      updated[i] = { ...updated[i], [field]: value };
      return { ...d, education: updated };
    });

  const removeEducation = (i: number) =>
    setDraft((d) => ({
      ...d,
      education: d.education.filter((_, idx) => idx !== i),
    }));

  // ── Project helpers ────────────────────────────────────────────────────────

  const addProject = () =>
    setDraft((d) => ({
      ...d,
      projects: [...(d.projects ?? []), { name: "", stack: "", description: "" }],
    }));

  const updateProject = (
    i: number,
    field: keyof ProjectEntry,
    value: string,
  ) =>
    setDraft((d) => {
      const updated = [...(d.projects ?? [])];
      updated[i] = { ...updated[i], [field]: value };
      return { ...d, projects: updated };
    });

  const removeProject = (i: number) =>
    setDraft((d) => ({
      ...d,
      projects: (d.projects ?? []).filter((_, idx) => idx !== i),
    }));

  // ── Field helper ───────────────────────────────────────────────────────────

  const field = (
    label: string,
    key: keyof Pick<
      UserProfile,
      | "full_name"
      | "email"
      | "phone"
      | "location"
      | "linkedin"
      | "github"
      | "website"
    >,
    placeholder?: string,
  ) => (
    <div className="space-y-1">
      <label className="text-muted-foreground text-xs">{label}</label>
      <Input
        value={draft[key]}
        onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
        placeholder={placeholder ?? label}
      />
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className="relative shrink-0 gap-1.5"
          disabled={disabled}
        >
          <HugeiconsIcon icon={UserCircleIcon} className="size-3.5" />
          Profile
          {hasProfile && (
            <span className="bg-primary absolute -top-1 -right-1 size-2 rounded-full" />
          )}
        </Button>
      </DialogTrigger>

      <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-2xl">
        <DialogHeader className="shrink-0">
          <DialogTitle>Your Profile</DialogTitle>
          <DialogDescription>
            Fill in your details once. The AI reads this every time it generates
            a resume — links and skills are always accurate, and experience /
            education give it context to tailor bullet points better.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="contact" className="min-h-0 flex-1">
          <TabsList className="shrink-0">
            <TabsTrigger value="contact">Contact & Links</TabsTrigger>
            <TabsTrigger value="skills">Skills</TabsTrigger>
            <TabsTrigger value="experience">Experience</TabsTrigger>
            <TabsTrigger value="education">Education</TabsTrigger>
            <TabsTrigger value="projects">Projects</TabsTrigger>
          </TabsList>

          {/* ── Contact & Links ── */}
          <TabsContent
            value="contact"
            className="mt-4 max-h-[50vh] overflow-y-auto"
          >
            <div className="grid grid-cols-2 gap-3">
              {field("Full Name", "full_name", "Jane Smith")}
              {field("Email", "email", "jane@example.com")}
              {field("Phone", "phone", "+1 (555) 000-0000")}
              {field("Location", "location", "San Francisco, CA")}
              {field("LinkedIn", "linkedin", "linkedin.com/in/username")}
              {field("GitHub", "github", "github.com/username")}
              {field("Website", "website", "yoursite.com")}
            </div>
            <p className="text-muted-foreground mt-3 text-xs">
              Links are only included in the resume if they are toggled{" "}
              <span className="font-medium">on</span> in Template Settings.
            </p>
          </TabsContent>

          {/* ── Skills ── */}
          <TabsContent
            value="skills"
            className="mt-4 max-h-[50vh] overflow-y-auto"
          >
            <div className="space-y-2">
              <label className="text-muted-foreground text-xs">
                Enter skills separated by commas
              </label>
              <Textarea
                value={skillsText}
                onChange={(e) => handleSkillsChange(e.target.value)}
                placeholder="React, TypeScript, Node.js, Python, AWS, PostgreSQL..."
                className="min-h-32 resize-none"
              />
              {draft.skills.length > 0 && (
                <p className="text-muted-foreground text-xs">
                  {draft.skills.length} skill
                  {draft.skills.length !== 1 ? "s" : ""} detected
                </p>
              )}
            </div>
          </TabsContent>

          {/* ── Experience ── */}
          <TabsContent
            value="experience"
            className="mt-4 max-h-[50vh] overflow-y-auto"
          >
            <div className="space-y-3">
              {draft.experience.length === 0 && (
                <p className="text-muted-foreground text-xs">
                  No experience entries yet. Add one below.
                </p>
              )}
              {draft.experience.map((entry, i) => (
                <div key={i} className="border-border relative border p-3">
                  <button
                    type="button"
                    onClick={() => removeExperience(i)}
                    className="text-muted-foreground hover:text-destructive absolute top-2 right-2 cursor-pointer transition-colors"
                    aria-label="Remove entry"
                  >
                    <HugeiconsIcon icon={Cancel01Icon} className="size-3.5" />
                  </button>
                  <div className="grid grid-cols-2 gap-2 pr-6">
                    <div className="col-span-2 space-y-1">
                      <label className="text-muted-foreground text-xs">
                        Job Title
                      </label>
                      <Input
                        value={entry.title}
                        onChange={(e) =>
                          updateExperience(i, "title", e.target.value)
                        }
                        placeholder="Senior Software Engineer"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-muted-foreground text-xs">
                        Company
                      </label>
                      <Input
                        value={entry.company}
                        onChange={(e) =>
                          updateExperience(i, "company", e.target.value)
                        }
                        placeholder="Acme Corp"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-muted-foreground text-xs">
                        Location
                      </label>
                      <Input
                        value={entry.location}
                        onChange={(e) =>
                          updateExperience(i, "location", e.target.value)
                        }
                        placeholder="San Francisco, CA"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-muted-foreground text-xs">
                        Start Year
                      </label>
                      <Input
                        value={entry.start_date}
                        onChange={(e) =>
                          updateExperience(i, "start_date", e.target.value)
                        }
                        placeholder="2020"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-muted-foreground text-xs">
                        End Year
                      </label>
                      <Input
                        value={entry.end_date}
                        onChange={(e) =>
                          updateExperience(i, "end_date", e.target.value)
                        }
                        placeholder="2024 or Present"
                      />
                    </div>
                  </div>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addExperience}
                className="w-full gap-1.5"
              >
                <HugeiconsIcon icon={PlusSignIcon} className="size-3.5" />
                Add Experience
              </Button>
            </div>
          </TabsContent>

          {/* ── Education ── */}
          <TabsContent
            value="education"
            className="mt-4 max-h-[50vh] overflow-y-auto"
          >
            <div className="space-y-3">
              {draft.education.length === 0 && (
                <p className="text-muted-foreground text-xs">
                  No education entries yet. Add one below.
                </p>
              )}
              {draft.education.map((entry, i) => (
                <div key={i} className="border-border relative border p-3">
                  <button
                    type="button"
                    onClick={() => removeEducation(i)}
                    className="text-muted-foreground hover:text-destructive absolute top-2 right-2 cursor-pointer transition-colors"
                    aria-label="Remove entry"
                  >
                    <HugeiconsIcon icon={Cancel01Icon} className="size-3.5" />
                  </button>
                  <div className="grid grid-cols-2 gap-2 pr-6">
                    <div className="col-span-2 space-y-1">
                      <label className="text-muted-foreground text-xs">
                        Degree
                      </label>
                      <Input
                        value={entry.degree}
                        onChange={(e) =>
                          updateEducation(i, "degree", e.target.value)
                        }
                        placeholder="B.S. Computer Science"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-muted-foreground text-xs">
                        Institution
                      </label>
                      <Input
                        value={entry.institution}
                        onChange={(e) =>
                          updateEducation(i, "institution", e.target.value)
                        }
                        placeholder="MIT"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-muted-foreground text-xs">
                        Year
                      </label>
                      <Input
                        value={entry.year}
                        onChange={(e) =>
                          updateEducation(i, "year", e.target.value)
                        }
                        placeholder="2019"
                      />
                    </div>
                  </div>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addEducation}
                className="w-full gap-1.5"
              >
                <HugeiconsIcon icon={PlusSignIcon} className="size-3.5" />
                Add Education
              </Button>
            </div>
          </TabsContent>
          {/* ── Projects ── */}
          <TabsContent
            value="projects"
            className="mt-4 max-h-[50vh] overflow-y-auto"
          >
            <p className="text-muted-foreground mb-3 text-xs">
              Add projects with their tech stack. The AI uses these to write
              targeted Upwork proposals and highlight relevant work.
            </p>
            <div className="space-y-3">
              {(draft.projects ?? []).length === 0 && (
                <p className="text-muted-foreground text-xs">
                  No projects yet. Add one below.
                </p>
              )}
              {(draft.projects ?? []).map((entry, i) => (
                <div key={i} className="border-border relative border p-3">
                  <button
                    type="button"
                    onClick={() => removeProject(i)}
                    className="text-muted-foreground hover:text-destructive absolute top-2 right-2 cursor-pointer transition-colors"
                    aria-label="Remove project"
                  >
                    <HugeiconsIcon icon={Cancel01Icon} className="size-3.5" />
                  </button>
                  <div className="space-y-2 pr-6">
                    <div className="space-y-1">
                      <label className="text-muted-foreground text-xs">
                        Project Name
                      </label>
                      <Input
                        value={entry.name}
                        onChange={(e) => updateProject(i, "name", e.target.value)}
                        placeholder="E-commerce Platform"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-muted-foreground text-xs">
                        Tech Stack
                      </label>
                      <Input
                        value={entry.stack}
                        onChange={(e) => updateProject(i, "stack", e.target.value)}
                        placeholder="React, Node.js, PostgreSQL, Stripe"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-muted-foreground text-xs">
                        Project URL
                      </label>
                      <Input
                        value={entry.url ?? ""}
                        onChange={(e) => updateProject(i, "url", e.target.value)}
                        placeholder="https://github.com/you/project"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-muted-foreground text-xs">
                        Short Description
                      </label>
                      <Textarea
                        value={entry.description}
                        onChange={(e) =>
                          updateProject(i, "description", e.target.value)
                        }
                        placeholder="Built a full-stack e-commerce platform with real-time inventory and Stripe checkout..."
                        className="min-h-16 resize-none"
                      />
                    </div>
                  </div>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addProject}
                className="w-full gap-1.5"
              >
                <HugeiconsIcon icon={PlusSignIcon} className="size-3.5" />
                Add Project
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="shrink-0 gap-2 pt-2">
          <button
            type="button"
            onClick={() => setDraft(EMPTY_PROFILE)}
            className="text-muted-foreground hover:text-foreground cursor-pointer text-xs transition-colors"
          >
            Clear all
          </button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Profile"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
