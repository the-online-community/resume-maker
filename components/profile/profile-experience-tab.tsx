"use client";

import { Cancel01Icon, PlusSignIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ExperienceEntry, UserProfile } from "@/lib/profile";

interface ProfileExperienceTabProps {
  draft: UserProfile;
  onChange: (profile: UserProfile) => void;
}

export function ProfileExperienceTab({
  draft,
  onChange,
}: ProfileExperienceTabProps) {
  const addExperience = () =>
    onChange({
      ...draft,
      experience: [
        ...draft.experience,
        { title: "", company: "", location: "", start_date: "", end_date: "" },
      ],
    });

  const updateExperience = (
    i: number,
    field: keyof ExperienceEntry,
    value: string,
  ) => {
    const updated = [...draft.experience];
    updated[i] = { ...updated[i], [field]: value };
    onChange({ ...draft, experience: updated });
  };

  const removeExperience = (i: number) =>
    onChange({
      ...draft,
      experience: draft.experience.filter((_, idx) => idx !== i),
    });

  return (
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
              <label className="text-muted-foreground text-xs">Job Title</label>
              <Input
                value={entry.title}
                onChange={(e) => updateExperience(i, "title", e.target.value)}
                placeholder="Senior Software Engineer"
              />
            </div>
            <div className="space-y-1">
              <label className="text-muted-foreground text-xs">Company</label>
              <Input
                value={entry.company}
                onChange={(e) => updateExperience(i, "company", e.target.value)}
                placeholder="Acme Corp"
              />
            </div>
            <div className="space-y-1">
              <label className="text-muted-foreground text-xs">Location</label>
              <Input
                value={entry.location}
                onChange={(e) => updateExperience(i, "location", e.target.value)}
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
              <label className="text-muted-foreground text-xs">End Year</label>
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
  );
}
