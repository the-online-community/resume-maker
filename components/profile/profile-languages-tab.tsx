"use client";

import { Cancel01Icon, PlusSignIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LANGUAGE_PROFICIENCIES,
  type LanguageEntry,
  type UserProfile,
} from "@/lib/profile";

interface ProfileLanguagesTabProps {
  draft: UserProfile;
  onChange: (profile: UserProfile) => void;
}

export function ProfileLanguagesTab({
  draft,
  onChange,
}: ProfileLanguagesTabProps) {
  const languages = draft.languages ?? [];

  const addLanguage = () =>
    onChange({
      ...draft,
      languages: [...languages, { language: "", proficiency: "Fluent" }],
    });

  const updateLanguage = (
    i: number,
    field: keyof LanguageEntry,
    value: string,
  ) => {
    const updated = [...languages];
    updated[i] = { ...updated[i], [field]: value };
    onChange({ ...draft, languages: updated });
  };

  const removeLanguage = (i: number) =>
    onChange({
      ...draft,
      languages: languages.filter((_, idx) => idx !== i),
    });

  return (
    <div className="space-y-3">
      {languages.length === 0 && (
        <p className="text-muted-foreground text-xs">
          No languages yet. Add one below.
        </p>
      )}
      {languages.map((entry, i) => (
        <div
          key={i}
          className="border-border relative flex items-center gap-2 border p-3 pr-10"
        >
          <div className="flex-1 space-y-1">
            <label className="text-muted-foreground text-xs">Language</label>
            <Input
              value={entry.language}
              onChange={(e) => updateLanguage(i, "language", e.target.value)}
              placeholder="English"
            />
          </div>
          <div className="w-36 space-y-1">
            <label className="text-muted-foreground text-xs">Proficiency</label>
            <Select
              value={entry.proficiency}
              onValueChange={(val) => updateLanguage(i, "proficiency", val)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGE_PROFICIENCIES.map((level) => (
                  <SelectItem key={level} value={level}>
                    {level}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <button
            type="button"
            onClick={() => removeLanguage(i)}
            className="text-muted-foreground hover:text-destructive absolute top-2 right-2 cursor-pointer transition-colors"
            aria-label="Remove language"
          >
            <HugeiconsIcon icon={Cancel01Icon} className="size-3.5" />
          </button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addLanguage}
        className="w-full gap-1.5"
      >
        <HugeiconsIcon icon={PlusSignIcon} className="size-3.5" />
        Add Language
      </Button>
    </div>
  );
}
