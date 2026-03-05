"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

/** Ensure a URL has a protocol prefix for href. */
export function toUrl(value: string) {
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value}`;
}

/** Popover for editing a link's display label and URL. */
export function LinkEditPopover({
  label,
  url,
  onSave,
  className,
}: {
  label: string;
  url: string;
  onSave: (label: string, url: string) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [editLabel, setEditLabel] = useState(label);
  const [editUrl, setEditUrl] = useState(url);

  const handleOpen = (nextOpen: boolean) => {
    if (nextOpen) {
      setEditLabel(label);
      setEditUrl(url);
    }
    setOpen(nextOpen);
  };

  const handleSave = () => {
    onSave(editLabel.trim(), editUrl.trim());
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={handleOpen}>
      <PopoverTrigger asChild>
        <span
          className={`resume-link resume-editable cursor-pointer ${className ?? ""}`}
          role="button"
          tabIndex={0}
        >
          {label}
        </span>
      </PopoverTrigger>
      <PopoverContent
        className="w-72 space-y-3 p-3"
        side="bottom"
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="space-y-1.5">
          <label className="text-muted-foreground text-xs font-medium">
            Label
          </label>
          <Input
            value={editLabel}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setEditLabel(e.target.value)
            }
            placeholder="Display text"
            className="h-8 text-sm"
            onKeyDown={(e: React.KeyboardEvent) =>
              e.key === "Enter" && handleSave()
            }
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-muted-foreground text-xs font-medium">
            URL
          </label>
          <Input
            value={editUrl}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setEditUrl(e.target.value)
            }
            placeholder="https://..."
            className="h-8 text-sm"
            onKeyDown={(e: React.KeyboardEvent) =>
              e.key === "Enter" && handleSave()
            }
          />
        </div>
        <Button size="sm" className="w-full" onClick={handleSave}>
          Save
        </Button>
      </PopoverContent>
    </Popover>
  );
}
