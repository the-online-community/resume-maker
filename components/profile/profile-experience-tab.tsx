"use client";

import { ArrowDown01Icon, ArrowUp01Icon, Cancel01Icon, PlusSignIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { UserProfile } from "@/lib/profile";

interface ProfileExperienceTabProps {
  draft: UserProfile;
  onChange: (profile: UserProfile) => void;
}

// ── Project picker (autocomplete from available projects) ───────────────────

function ProjectPicker({
  selected,
  available,
  onAdd,
  onRemove,
}: {
  selected: string[];
  available: string[];
  onAdd: (name: string) => void;
  onRemove: (name: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlightIndex, setHighlightIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const unselected = available.filter(
    (p) =>
      !selected.includes(p) && p.toLowerCase().includes(query.toLowerCase()),
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((i) => Math.min(i + 1, unselected.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (unselected[highlightIndex]) {
        onAdd(unselected[highlightIndex]);
        setQuery("");
        setHighlightIndex(0);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  return (
    <div className="col-span-2 space-y-1.5">
      <label className="text-muted-foreground text-xs">Linked Projects</label>

      {/* Selected project chips */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selected.map((name) => (
            <span
              key={name}
              className="bg-secondary text-secondary-foreground inline-flex items-center gap-1 rounded-none px-2 py-0.5 text-xs"
            >
              {name}
              <button
                type="button"
                onClick={() => onRemove(name)}
                className="hover:text-destructive cursor-pointer transition-colors"
                aria-label={`Remove ${name}`}
              >
                <HugeiconsIcon icon={Cancel01Icon} className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Autocomplete input */}
      {available.length > 0 && (
        <div className="relative">
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setHighlightIndex(0);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            onBlur={() => setTimeout(() => setIsOpen(false), 150)}
            onKeyDown={handleKeyDown}
            placeholder="Search projects to link…"
            className="h-7 text-xs"
          />
          {isOpen && unselected.length > 0 && (
            <ul className="border-border bg-popover absolute z-10 mt-1 max-h-40 w-full overflow-auto rounded border shadow-md">
              {unselected.map((name, idx) => (
                <li
                  key={name}
                  className={`cursor-pointer px-2 py-1.5 text-xs ${
                    idx === highlightIndex
                      ? "bg-accent text-accent-foreground"
                      : "hover:bg-accent/50"
                  }`}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onAdd(name);
                    setQuery("");
                    setHighlightIndex(0);
                  }}
                  onMouseEnter={() => setHighlightIndex(idx)}
                >
                  {name}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {available.length === 0 && (
        <p className="text-muted-foreground text-xs italic">
          Add projects in the Projects tab to link them here.
        </p>
      )}
    </div>
  );
}

// ── Experience tab ──────────────────────────────────────────────────────────

export function ProfileExperienceTab({
  draft,
  onChange,
}: ProfileExperienceTabProps) {
  const availableProjects = (draft.projects ?? [])
    .map((p) => p.name)
    .filter(Boolean);

  const addExperience = () =>
    onChange({
      ...draft,
      experience: [
        ...draft.experience,
        {
          title: "",
          company: "",
          location: "",
          start_date: "",
          end_date: "",
          projects: [],
        },
      ],
    });

  const updateExperience = (i: number, field: string, value: unknown) => {
    const updated = [...draft.experience];
    updated[i] = { ...updated[i], [field]: value };
    onChange({ ...draft, experience: updated });
  };

  const removeExperience = (i: number) =>
    onChange({
      ...draft,
      experience: draft.experience.filter((_, idx) => idx !== i),
    });

  const moveExperience = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= draft.experience.length) return;
    const updated = [...draft.experience];
    [updated[index], updated[target]] = [updated[target], updated[index]];
    onChange({ ...draft, experience: updated });
  };

  return (
    <div className="space-y-3">
      {/* Years of experience */}
      <div className="space-y-2 space-x-2">
        <label className="text-muted-foreground text-xs">
          Total Years of Experience
        </label>
        <Input
          type="number"
          min={0}
          max={50}
          value={draft.years_of_experience ?? ""}
          onChange={(e) =>
            onChange({
              ...draft,
              years_of_experience: e.target.value
                ? Number(e.target.value)
                : undefined,
            })
          }
          placeholder="e.g. 8"
          className="w-32"
        />
      </div>

      {draft.experience.length === 0 && (
        <p className="text-muted-foreground text-xs">
          No experience entries yet. Add one below.
        </p>
      )}
      {draft.experience.map((entry, i) => (
        <div key={i} className="border-border flex gap-2 border p-3">
          {/* Reorder arrows */}
          <div className="flex shrink-0 flex-col justify-center gap-0.5">
            <button
              type="button"
              onClick={() => moveExperience(i, -1)}
              disabled={i === 0}
              className="text-muted-foreground hover:text-foreground cursor-pointer disabled:cursor-default disabled:opacity-20"
              aria-label="Move up"
            >
              <HugeiconsIcon icon={ArrowUp01Icon} className="size-3" />
            </button>
            <button
              type="button"
              onClick={() => moveExperience(i, 1)}
              disabled={i === draft.experience.length - 1}
              className="text-muted-foreground hover:text-foreground cursor-pointer disabled:cursor-default disabled:opacity-20"
              aria-label="Move down"
            >
              <HugeiconsIcon icon={ArrowDown01Icon} className="size-3" />
            </button>
          </div>

          <div className="relative min-w-0 flex-1">
            <button
              type="button"
              onClick={() => removeExperience(i)}
              className="text-muted-foreground hover:text-destructive absolute top-0 right-0 cursor-pointer transition-colors"
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
              <label className="text-muted-foreground text-xs">End Year</label>
              <Input
                value={entry.end_date}
                onChange={(e) =>
                  updateExperience(i, "end_date", e.target.value)
                }
                placeholder="2024 or Present"
              />
            </div>

            {/* Project linker */}
            <ProjectPicker
              selected={entry.projects ?? []}
              available={availableProjects}
              onAdd={(name) =>
                updateExperience(i, "projects", [
                  ...(entry.projects ?? []),
                  name,
                ])
              }
              onRemove={(name) =>
                updateExperience(
                  i,
                  "projects",
                  (entry.projects ?? []).filter((p) => p !== name),
                )
              }
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
