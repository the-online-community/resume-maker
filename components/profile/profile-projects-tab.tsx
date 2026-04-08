"use client";

import { Cancel01Icon, PlusSignIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { ExperienceEntry, ProjectEntry, UserProfile } from "@/lib/profile";

interface ProfileProjectsTabProps {
  draft: UserProfile;
  onChange: (profile: UserProfile) => void;
}

// ── AI Import prompt ──────────────────────────────────────────────────────────

const IMPORT_PROMPT = `You are helping me build my professional profile for resume tailoring. Analyze this codebase, then BEFORE generating the final JSON, ask me questions to fill in gaps the code alone can't answer.

## Step 1: Ask me questions

After analyzing the code, ask me about:
- **Scale & metrics**: How many users/requests/records does this handle? What's the traffic like?
- **Performance wins**: Did you measure any speed improvements, load time reductions, or cost savings?
- **Team & role**: Did you build this solo or on a team? What was your specific role?
- **Business impact**: Did this increase revenue, reduce churn, save time, or hit any business goals?
- **Challenges**: What was the hardest technical problem you solved? Any interesting debugging stories?
- **Context**: Is this a side project, freelance work, startup, or enterprise? How long did it take?

Only ask questions that are relevant — skip any you can already answer from the code. Keep it concise (5-8 questions max).

## Step 2: After I answer, generate this JSON

Use both the code analysis AND my answers to produce the best possible highlights — grounded in real facts, with real numbers where I provided them.

{
  "projects": [
    {
      "name": "Project Name",
      "stack": "React, Node.js, PostgreSQL",
      "description": "Brief description of what it does",
      "role": "Your role (e.g. Lead Developer, Sole Developer)",
      "highlights": [
        "Specific measurable achievement with real numbers",
        "Another highlight grounded in actual impact"
      ]
    }
  ]
}

Rules:
- For "highlights": write resume-ready bullet points — start with action verbs, include metrics I provided, focus on impact not just features
- Do not include a "url" or "skills" field — I manage skills separately
- Do not invent numbers or metrics I didn't provide — if I didn't give a number, describe the impact qualitatively`;

interface ParsedImport {
  projects?: Omit<ProjectEntry, "id">[];
}

// ── Experience picker (link project → experiences) ───────────────────────────

function ExperiencePicker({
  projectName,
  experiences,
  linkedIndices,
  onToggle,
}: {
  projectName: string;
  experiences: ExperienceEntry[];
  linkedIndices: number[];
  onToggle: (expIndex: number) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlightIndex, setHighlightIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = experiences
    .map((exp, i) => ({ exp, i }))
    .filter(
      ({ exp }) =>
        `${exp.title} ${exp.company}`
          .toLowerCase()
          .includes(query.toLowerCase()),
    );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[highlightIndex]) {
        onToggle(filtered[highlightIndex].i);
        setQuery("");
        setHighlightIndex(0);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  const linkedExps = linkedIndices.map((i) => experiences[i]).filter(Boolean);

  return (
    <div className="space-y-1.5">
      <label className="text-muted-foreground text-xs">
        Linked Experience
      </label>

      {/* Selected experience chips */}
      {linkedExps.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {linkedIndices.map((i) => {
            const exp = experiences[i];
            if (!exp) return null;
            const label = [exp.title, exp.company].filter(Boolean).join(" @ ");
            return (
              <span
                key={i}
                className="bg-secondary text-secondary-foreground inline-flex items-center gap-1 rounded-none px-2 py-0.5 text-xs"
              >
                {label || `Experience ${i + 1}`}
                <button
                  type="button"
                  onClick={() => onToggle(i)}
                  className="hover:text-destructive cursor-pointer transition-colors"
                  aria-label={`Unlink ${label}`}
                >
                  <HugeiconsIcon icon={Cancel01Icon} className="size-3" />
                </button>
              </span>
            );
          })}
        </div>
      )}

      {/* Search input */}
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
          placeholder="Search experiences to link…"
          className="h-7 text-xs"
        />
        {isOpen && filtered.length > 0 && (
          <ul className="border-border bg-popover absolute z-10 mt-1 max-h-40 w-full overflow-auto rounded border shadow-md">
            {filtered.map(({ exp, i }, idx) => {
              const label =
                [exp.title, exp.company].filter(Boolean).join(" @ ") ||
                `Experience ${i + 1}`;
              const isLinked = linkedIndices.includes(i);
              return (
                <li
                  key={i}
                  className={`flex cursor-pointer items-center gap-2 px-2 py-1.5 text-xs ${
                    idx === highlightIndex
                      ? "bg-accent text-accent-foreground"
                      : "hover:bg-accent/50"
                  }`}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onToggle(i);
                    setQuery("");
                    setHighlightIndex(0);
                  }}
                  onMouseEnter={() => setHighlightIndex(idx)}
                >
                  <span
                    className={`size-3 shrink-0 border ${isLinked ? "bg-primary border-primary" : "border-input"}`}
                  />
                  {label}
                  {exp.start_date && (
                    <span className="text-muted-foreground">
                      ({exp.start_date}
                      {exp.end_date ? `–${exp.end_date}` : ""})
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

// ── Collapsible project card ──────────────────────────────────────────────────

function ProjectCard({
  entry,
  index,
  isOpen,
  onToggle,
  onUpdate,
  onRemove,
  experiences,
  linkedExpIndices,
  onToggleExp,
}: {
  entry: ProjectEntry;
  index: number;
  isOpen: boolean;
  onToggle: () => void;
  onUpdate: (field: string, value: unknown) => void;
  onRemove: () => void;
  experiences: ExperienceEntry[];
  linkedExpIndices: number[];
  onToggleExp: (expIndex: number) => void;
}) {
  const label = entry.name || `Project ${index + 1}`;

  return (
    <div className="border-border border">
      {/* Header — click to collapse/expand */}
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full cursor-pointer items-center justify-between px-3 py-2.5"
      >
        <div className="flex min-w-0 items-center gap-2">
          <svg
            width="14"
            height="14"
            viewBox="0 0 16 16"
            fill="none"
            className={`text-muted-foreground shrink-0 transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`}
          >
            <path
              d="M6 4l4 4-4 4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="truncate text-sm font-medium">{label}</span>
        </div>
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.stopPropagation();
              onRemove();
            }
          }}
          className="text-muted-foreground hover:text-destructive shrink-0 cursor-pointer transition-colors"
          aria-label="Remove project"
        >
          <HugeiconsIcon icon={Cancel01Icon} className="size-3.5" />
        </span>
      </button>

      {/* Body */}
      {isOpen && (
        <div className="space-y-3 border-t px-3 pt-3 pb-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-muted-foreground text-xs">
                Project Name
              </label>
              <Input
                value={entry.name}
                onChange={(e) => onUpdate("name", e.target.value)}
                placeholder="E-commerce Platform"
              />
            </div>
            <div className="space-y-1">
              <label className="text-muted-foreground text-xs">
                Tech Stack
              </label>
              <Input
                value={entry.stack}
                onChange={(e) => onUpdate("stack", e.target.value)}
                placeholder="React, Node.js, PostgreSQL"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-muted-foreground text-xs">Your Role</label>
              <Input
                value={entry.role ?? ""}
                onChange={(e) => onUpdate("role", e.target.value)}
                placeholder="Lead Frontend Engineer"
              />
            </div>
            <div className="space-y-1">
              <label className="text-muted-foreground text-xs">
                Project URL
              </label>
              <Input
                value={entry.url ?? ""}
                onChange={(e) => onUpdate("url", e.target.value)}
                placeholder="https://github.com/you/project"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-muted-foreground text-xs">Description</label>
            <Textarea
              value={entry.description}
              onChange={(e) => onUpdate("description", e.target.value)}
              placeholder="Built a full-stack e-commerce platform with real-time inventory and Stripe checkout..."
              className="min-h-16 resize-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-muted-foreground text-xs">
              Key Highlights / Achievements (one per line)
            </label>
            <Textarea
              value={(entry.highlights ?? []).join("\n")}
              onChange={(e) =>
                onUpdate(
                  "highlights",
                  e.target.value.split("\n").filter((l) => l.trim() !== ""),
                )
              }
              placeholder={"Reduced page load time by 40%\nImplemented real-time search serving 10k+ queries/day\nLed migration from monolith to microservices"}
              className="min-h-20 resize-none"
            />
          </div>

          {/* Link to experience — only if experiences exist */}
          {experiences.length > 0 && (
            <ExperiencePicker
              projectName={entry.name}
              experiences={experiences}
              linkedIndices={linkedExpIndices}
              onToggle={onToggleExp}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ── Main tab ──────────────────────────────────────────────────────────────────

export function ProfileProjectsTab({
  draft,
  onChange,
}: ProfileProjectsTabProps) {
  const projects = draft.projects ?? [];

  // Track which cards are open — all collapsed by default
  const [openCards, setOpenCards] = useState<Set<number>>(
    () => new Set<number>(),
  );

  // AI Import state
  const [jsonInput, setJsonInput] = useState("");
  const [parsed, setParsed] = useState<ParsedImport | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showImport, setShowImport] = useState(false);

  const toggleCard = (i: number) => {
    setOpenCards((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  const addProject = () => {
    const newIndex = projects.length;
    onChange({
      ...draft,
      projects: [
        ...projects,
        { name: "", stack: "", description: "", role: "", highlights: [] },
      ],
    });
    setOpenCards((prev) => new Set(prev).add(newIndex));
  };

  const updateProject = (i: number, field: string, value: unknown) => {
    const updated = [...projects];
    updated[i] = { ...updated[i], [field]: value };
    onChange({ ...draft, projects: updated });
  };

  const removeProject = (i: number) => {
    const removedName = projects[i]?.name;
    // Also unlink from any experience entries
    const updatedExperience = removedName
      ? draft.experience.map((exp) =>
          exp.projects?.includes(removedName)
            ? { ...exp, projects: exp.projects.filter((p) => p !== removedName) }
            : exp,
        )
      : draft.experience;

    onChange({
      ...draft,
      projects: projects.filter((_, idx) => idx !== i),
      experience: updatedExperience,
    });
    // Shift open card indices
    setOpenCards((prev) => {
      const next = new Set<number>();
      for (const idx of prev) {
        if (idx < i) next.add(idx);
        else if (idx > i) next.add(idx - 1);
      }
      return next;
    });
  };

  /** Get experience indices that link to a given project name */
  const getLinkedExpIndices = (projectName: string): number[] => {
    if (!projectName) return [];
    return draft.experience
      .map((exp, i) => (exp.projects?.includes(projectName) ? i : -1))
      .filter((i) => i !== -1);
  };

  /** Toggle a project↔experience link from the project side */
  const toggleExpLink = (projectName: string, expIndex: number) => {
    if (!projectName) return;
    const exp = draft.experience[expIndex];
    if (!exp) return;

    const currentProjects = exp.projects ?? [];
    const isLinked = currentProjects.includes(projectName);
    const updatedProjects = isLinked
      ? currentProjects.filter((p) => p !== projectName)
      : [...currentProjects, projectName];

    const updatedExperience = [...draft.experience];
    updatedExperience[expIndex] = { ...exp, projects: updatedProjects };
    onChange({ ...draft, experience: updatedExperience });
  };

  // ── AI Import handlers ──

  const handleCopy = async () => {
    await navigator.clipboard.writeText(IMPORT_PROMPT);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleParse = () => {
    setParseError(null);
    setParsed(null);

    try {
      let text = jsonInput.trim();
      const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (codeBlockMatch) {
        text = codeBlockMatch[1].trim();
      }

      const data = JSON.parse(text) as ParsedImport;

      if (!data.projects || !Array.isArray(data.projects)) {
        setParseError('JSON must have a "projects" array.');
        return;
      }

      setParsed({
        projects: data.projects,
      });
    } catch {
      setParseError(
        "Invalid JSON. Make sure to paste the complete JSON output from your AI tool.",
      );
    }
  };

  const handleConfirmImport = () => {
    if (!parsed) return;

    const newProjects: ProjectEntry[] = (parsed.projects ?? []).map((p) => ({
      name: p.name ?? "",
      stack: p.stack ?? "",
      description: p.description ?? "",
      url: p.url,
      role: p.role,
      highlights: p.highlights,
    }));

    const startIndex = projects.length;

    onChange({
      ...draft,
      projects: [...projects, ...newProjects],
    });

    // Open all newly imported cards
    setOpenCards((prev) => {
      const next = new Set(prev);
      for (let i = 0; i < newProjects.length; i++) {
        next.add(startIndex + i);
      }
      return next;
    });

    toast.success(`Imported ${newProjects.length} project${newProjects.length !== 1 ? "s" : ""}`);

    // Reset
    setJsonInput("");
    setParsed(null);
    setParseError(null);
  };

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-xs">
        Add projects with their tech stack and key achievements. The AI uses
        these to write targeted resume bullet points.
      </p>

      {/* Project cards */}
      {projects.length === 0 && !showImport && (
        <p className="text-muted-foreground py-4 text-center text-xs">
          No projects yet. Add one manually or import from a codebase using AI.
        </p>
      )}

      <div className="space-y-2">
        {projects.map((entry, i) => (
          <ProjectCard
            key={i}
            entry={entry}
            index={i}
            isOpen={openCards.has(i)}
            onToggle={() => toggleCard(i)}
            onUpdate={(field, value) => updateProject(i, field, value)}
            onRemove={() => removeProject(i)}
            experiences={draft.experience}
            linkedExpIndices={getLinkedExpIndices(entry.name)}
            onToggleExp={(expIndex) => toggleExpLink(entry.name, expIndex)}
          />
        ))}
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addProject}
          className="flex-1 gap-1.5"
        >
          <HugeiconsIcon icon={PlusSignIcon} className="size-3.5" />
          Add Project
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowImport(!showImport)}
          className="flex-1 gap-1.5 text-xs"
        >
          {showImport ? "Hide AI Import" : "Import from AI"}
        </Button>
      </div>

      {/* AI Import section */}
      {showImport && (
        <div className="space-y-4 border-t pt-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">AI Import</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                className="h-7 text-xs"
              >
                {copied ? "Copied!" : "Copy prompt"}
              </Button>
            </div>
            <p className="text-muted-foreground text-xs">
              Copy the prompt, paste it into your AI tool while it has access to
              your codebase, then paste the JSON result below. You can run this
              for multiple codebases — data is appended, never replaced.
            </p>
          </div>

          <Textarea
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            placeholder="Paste the JSON output here..."
            className="min-h-32 resize-none font-mono text-xs"
          />
          {parseError && (
            <p className="text-destructive text-xs">{parseError}</p>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleParse}
            disabled={!jsonInput.trim()}
            className="text-xs"
          >
            Parse
          </Button>

          {/* Preview */}
          {parsed && (
            <div className="space-y-3 border p-3">
              <h4 className="text-sm font-medium">Preview</h4>
              <p className="text-muted-foreground text-xs">
                <span className="text-foreground font-medium">
                  {(parsed.projects ?? []).length}
                </span>{" "}
                project{(parsed.projects ?? []).length !== 1 ? "s" : ""}
              </p>
              {(parsed.projects ?? []).map((p, i) => (
                <div key={i} className="text-xs">
                  <span className="font-medium">{p.name}</span>
                  {p.stack && (
                    <span className="text-muted-foreground"> — {p.stack}</span>
                  )}
                  {(p.highlights ?? []).length > 0 && (
                    <span className="text-muted-foreground">
                      {" "}
                      · {p.highlights!.length} highlight
                      {p.highlights!.length !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>
              ))}
              <Button
                size="sm"
                onClick={handleConfirmImport}
                className="bg-green-600 text-xs hover:bg-green-700"
              >
                Confirm Import
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
