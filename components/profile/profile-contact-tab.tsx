"use client";

import {
  ArrowDown01Icon,
  ArrowUp01Icon,
  Cancel01Icon,
  Link01Icon,
  PlusSignIcon,
  TextIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  defaultContactFields,
  type ContactField,
  type UserProfile,
} from "@/lib/profile";

interface ProfileContactTabProps {
  draft: UserProfile;
  onChange: (profile: UserProfile) => void;
}

export function ProfileContactTab({ draft, onChange }: ProfileContactTabProps) {
  const fields = draft.contact_fields?.length
    ? draft.contact_fields
    : defaultContactFields();

  const updateField = (index: number, updates: Partial<ContactField>) => {
    const updated = [...fields];
    updated[index] = { ...updated[index], ...updates };
    onChange({ ...draft, contact_fields: updated });
  };

  const removeField = (index: number) => {
    onChange({
      ...draft,
      contact_fields: fields.filter((_, i) => i !== index),
    });
  };

  const moveField = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= fields.length) return;
    const updated = [...fields];
    [updated[index], updated[targetIndex]] = [
      updated[targetIndex],
      updated[index],
    ];
    onChange({ ...draft, contact_fields: updated });
  };

  const addField = (type: "text" | "link") => {
    const id = `custom_${Date.now()}`;
    const newField: ContactField = {
      id,
      type,
      label: "",
      value: "",
      url: type === "link" ? "" : undefined,
      visible: true,
    };
    onChange({ ...draft, contact_fields: [...fields, newField] });
  };

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-xs">
        Add your contact details. Toggle visibility to control what shows on
        your resume. Drag order with arrows.
      </p>

      {/* Field rows */}
      <div className="space-y-2">
        {fields.map((field, i) => (
          <div
            key={field.id}
            className="border-border flex items-center gap-2 border px-2 py-2"
          >
            {/* Reorder arrows */}
            <div className="flex shrink-0 flex-col gap-0.5">
              <button
                type="button"
                onClick={() => moveField(i, -1)}
                disabled={i === 0}
                className="text-muted-foreground hover:text-foreground cursor-pointer disabled:cursor-default disabled:opacity-20"
                aria-label="Move up"
              >
                <HugeiconsIcon icon={ArrowUp01Icon} className="size-3" />
              </button>
              <button
                type="button"
                onClick={() => moveField(i, 1)}
                disabled={i === fields.length - 1}
                className="text-muted-foreground hover:text-foreground cursor-pointer disabled:cursor-default disabled:opacity-20"
                aria-label="Move down"
              >
                <HugeiconsIcon icon={ArrowDown01Icon} className="size-3" />
              </button>
            </div>

            {/* Visibility toggle */}
            <Switch
              checked={field.visible}
              onCheckedChange={(checked) =>
                updateField(i, { visible: checked })
              }
              className="shrink-0 scale-75"
              aria-label={`Toggle ${field.label} visibility`}
            />

            {/* Type indicator */}
            <span className="text-muted-foreground shrink-0">
              <HugeiconsIcon
                icon={field.type === "link" ? Link01Icon : TextIcon}
                className="size-3.5"
              />
            </span>

            {/* Label + Value inputs */}
            <div className="grid min-w-0 flex-1 grid-cols-2 gap-1.5">
              <Input
                value={field.label}
                onChange={(e) => updateField(i, { label: e.target.value })}
                placeholder="Label"
                className="h-7 text-xs"
              />
              <Input
                value={field.value}
                onChange={(e) => updateField(i, { value: e.target.value })}
                placeholder={field.type === "link" ? "Display text" : "Value"}
                className="h-7 text-xs"
              />
              {field.type === "link" && (
                <Input
                  value={field.url ?? ""}
                  onChange={(e) => updateField(i, { url: e.target.value })}
                  placeholder="https://..."
                  className="col-span-2 h-7 text-xs"
                />
              )}
            </div>

            {/* Delete */}
            <button
              type="button"
              onClick={() => removeField(i)}
              className="text-muted-foreground hover:text-destructive shrink-0 cursor-pointer transition-colors"
              aria-label="Remove field"
            >
              <HugeiconsIcon icon={Cancel01Icon} className="size-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Add buttons */}
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => addField("text")}
          className="flex-1 gap-1.5"
        >
          <HugeiconsIcon icon={TextIcon} className="size-3.5" />
          Add Text Field
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => addField("link")}
          className="flex-1 gap-1.5"
        >
          <HugeiconsIcon icon={Link01Icon} className="size-3.5" />
          Add Link Field
        </Button>
      </div>
    </div>
  );
}
