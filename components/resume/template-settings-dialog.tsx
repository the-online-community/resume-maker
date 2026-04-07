"use client";

import {
  ArrowDown01Icon,
  ArrowUp01Icon,
  Settings01Icon,
} from "@hugeicons/core-free-icons";
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
import {
  ALL_HEADER_FIELDS,
  ALL_SECTIONS,
  DEFAULT_SETTINGS,
  type TemplateSettings,
} from "@/lib/resume/templates";

interface TemplateSettingsDialogProps {
  settings: TemplateSettings;
  onSave: (settings: TemplateSettings) => void;
  isSaving?: boolean;
  disabled?: boolean;
  hasProfile?: boolean;
}

export function TemplateSettingsDialog({
  settings,
  onSave,
  disabled,
}: TemplateSettingsDialogProps) {
  const [open, setOpen] = useState(false);

  // Apply changes immediately — every toggle/reorder calls onSave
  const update = useCallback(
    (next: TemplateSettings) => {
      onSave(next);
    },
    [onSave],
  );

  const handleReset = useCallback(() => {
    update(DEFAULT_SETTINGS);
  }, [update]);

  // ── Section helpers ──

  const moveSection = (index: number, direction: -1 | 1) => {
    const newSections = [...settings.sections];
    const target = index + direction;
    if (target < 0 || target >= newSections.length) return;
    [newSections[index], newSections[target]] = [
      newSections[target],
      newSections[index],
    ];
    update({ ...settings, sections: newSections });
  };

  const toggleSection = (key: string) => {
    const has = settings.sections.includes(key);
    update({
      ...settings,
      sections: has
        ? settings.sections.filter((s) => s !== key)
        : [...settings.sections, key],
    });
  };

  const toggleHeaderField = (key: string) => {
    const has = settings.headerFields.includes(key);
    update({
      ...settings,
      headerFields: has
        ? settings.headerFields.filter((f) => f !== key)
        : [...settings.headerFields, key],
    });
  };

  // Build ordered list: enabled sections first (in order), then disabled ones
  const enabledSections = settings.sections;
  const disabledSections = ALL_SECTIONS.filter(
    (s) => !enabledSections.includes(s.key),
  );
  const orderedSections = [
    ...enabledSections
      .map((key) => ALL_SECTIONS.find((s) => s.key === key))
      .filter((s): s is (typeof ALL_SECTIONS)[number] => s !== undefined),
    ...disabledSections,
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="lg"
          variant="outline"
          className="shrink-0"
          disabled={disabled}
        >
          <HugeiconsIcon icon={Settings01Icon} className="size-4" />
          Template
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Template Settings</DialogTitle>
          <DialogDescription>
            Customize which sections and contact fields appear in your resume,
            their order, and formatting options.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] space-y-6 overflow-y-auto py-2">
          {/* ── Sections ── */}
          <fieldset>
            <legend className="mb-2 text-sm font-semibold">Sections</legend>
            <p className="text-muted-foreground mb-3 text-xs">
              Check to include, use arrows to reorder.
            </p>
            <div className="space-y-1.5">
              {orderedSections.map((section) => {
                const enabled = enabledSections.includes(section.key);
                const index = enabledSections.indexOf(section.key);

                return (
                  <div
                    key={section.key}
                    className={`flex items-center gap-2 rounded-md border px-3 py-2 ${
                      enabled
                        ? "bg-background"
                        : "bg-muted/50 border-dashed opacity-60"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={() => toggleSection(section.key)}
                      className="accent-primary size-3.5 cursor-pointer"
                      id={`section-${section.key}`}
                    />
                    <label
                      htmlFor={`section-${section.key}`}
                      className="flex-1 cursor-pointer text-sm"
                    >
                      {section.label}
                    </label>
                    {enabled && (
                      <div className="flex gap-0.5">
                        <button
                          type="button"
                          onClick={() => moveSection(index, -1)}
                          disabled={index === 0}
                          className="text-muted-foreground hover:text-foreground cursor-pointer rounded p-0.5 transition-colors disabled:cursor-default disabled:opacity-30"
                        >
                          <HugeiconsIcon
                            icon={ArrowUp01Icon}
                            className="size-3.5"
                          />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveSection(index, 1)}
                          disabled={index === enabledSections.length - 1}
                          className="text-muted-foreground hover:text-foreground cursor-pointer rounded p-0.5 transition-colors disabled:cursor-default disabled:opacity-30"
                        >
                          <HugeiconsIcon
                            icon={ArrowDown01Icon}
                            className="size-3.5"
                          />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </fieldset>

          {/* ── Header Fields ── */}
          <fieldset>
            <legend className="mb-2 text-sm font-semibold">
              Header Contact Fields
            </legend>
            <p className="text-muted-foreground mb-3 text-xs">
              Choose which contact details appear below your name.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {ALL_HEADER_FIELDS.map((field) => (
                <label
                  key={field.key}
                  className="flex cursor-pointer items-center gap-2 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={settings.headerFields.includes(field.key)}
                    onChange={() => toggleHeaderField(field.key)}
                    className="accent-primary size-3.5 cursor-pointer"
                  />
                  {field.label}
                </label>
              ))}
            </div>
          </fieldset>

          {/* ── Bold Labels ── */}
          <fieldset>
            <legend className="mb-2 text-sm font-semibold">Formatting</legend>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={settings.boldLabels}
                onChange={() =>
                  update({ ...settings, boldLabels: !settings.boldLabels })
                }
                className="accent-primary size-3.5 cursor-pointer"
              />
              Bold section headings and role titles
            </label>
          </fieldset>

          {/* ── Bullet Style ── */}
          <fieldset>
            <legend className="mb-2 text-sm font-semibold">Bullet Style</legend>
            <div className="flex gap-4">
              {(["dot", "dash"] as const).map((style) => (
                <label
                  key={style}
                  className="flex cursor-pointer items-center gap-2 text-sm"
                >
                  <input
                    type="radio"
                    name="bulletStyle"
                    value={style}
                    checked={settings.bulletStyle === style}
                    onChange={() => update({ ...settings, bulletStyle: style })}
                    className="accent-primary size-3.5 cursor-pointer"
                  />
                  {style === "dot" ? "• Dot" : "— Dash"}
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        <DialogFooter className="gap-2">
          <button
            type="button"
            onClick={handleReset}
            className="text-muted-foreground hover:text-foreground cursor-pointer text-xs transition-colors"
          >
            Reset to defaults
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
