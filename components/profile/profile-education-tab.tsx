"use client";

import { Cancel01Icon, PlusSignIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { EducationEntry, UserProfile } from "@/lib/profile";

interface ProfileEducationTabProps {
  draft: UserProfile;
  onChange: (profile: UserProfile) => void;
}

export function ProfileEducationTab({
  draft,
  onChange,
}: ProfileEducationTabProps) {
  const addEducation = () =>
    onChange({
      ...draft,
      education: [
        ...draft.education,
        { degree: "", institution: "", year: "" },
      ],
    });

  const updateEducation = (
    i: number,
    field: keyof EducationEntry,
    value: string,
  ) => {
    const updated = [...draft.education];
    updated[i] = { ...updated[i], [field]: value };
    onChange({ ...draft, education: updated });
  };

  const removeEducation = (i: number) =>
    onChange({
      ...draft,
      education: draft.education.filter((_, idx) => idx !== i),
    });

  return (
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
              <label className="text-muted-foreground text-xs">Degree</label>
              <Input
                value={entry.degree}
                onChange={(e) => updateEducation(i, "degree", e.target.value)}
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
              <label className="text-muted-foreground text-xs">Year</label>
              <Input
                value={entry.year}
                onChange={(e) => updateEducation(i, "year", e.target.value)}
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
  );
}
