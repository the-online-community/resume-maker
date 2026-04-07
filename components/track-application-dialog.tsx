"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

// ── Autocomplete Input ────────────────────────────────────────────────────────

function AutocompleteInput({
  value,
  onChange,
  suggestions,
  placeholder,
  autoFocus,
}: {
  value: string;
  onChange: (val: string) => void;
  suggestions: string[];
  placeholder: string;
  autoFocus?: boolean;
}) {
  const [showDropdown, setShowDropdown] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = suggestions.filter(
    (s) => s.toLowerCase().includes(value.toLowerCase()) && s !== value,
  );

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <Input
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setShowDropdown(true);
        }}
        onFocus={() => setShowDropdown(true)}
        placeholder={placeholder}
        className="text-sm"
      />
      {showDropdown && filtered.length > 0 && (
        <div className="bg-popover absolute top-full left-0 z-50 mt-1 max-h-36 w-full overflow-y-auto rounded border shadow-md">
          {filtered.map((item) => (
            <button
              key={item}
              type="button"
              className="hover:bg-muted w-full cursor-pointer px-3 py-1.5 text-left text-sm"
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(item);
                setShowDropdown(false);
              }}
            >
              {item}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Dialog ───────────────────────────────────────────────────────────────

interface TrackApplicationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  position: string;
  company: string;
  resumeData: Record<string, string> | null;
  cities: string[];
  platforms: string[];
  onTrack: (data: {
    position: string;
    company: string;
    platform: string;
    job_url: string;
    notes: string;
    resume_data: Record<string, string> | null;
  }) => Promise<void>;
}

export function TrackApplicationDialog({
  open,
  onOpenChange,
  position: initialPosition,
  company: initialCompany,
  resumeData,
  cities,
  platforms,
  onTrack,
}: TrackApplicationDialogProps) {
  const [position, setPosition] = useState(initialPosition);
  const [company, setCompany] = useState(initialCompany);
  const [platform, setPlatform] = useState("");
  const [jobUrl, setJobUrl] = useState("");
  const [city, setCity] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset fields when dialog opens with new data
  useEffect(() => {
    if (open) {
      setPosition(initialPosition);
      setCompany(initialCompany);
      setPlatform("");
      setJobUrl("");
      setCity("");
    }
  }, [open, initialPosition, initialCompany]);

  const handleSubmit = useCallback(async () => {
    if (!position.trim()) return;
    setIsSubmitting(true);
    try {
      await onTrack({
        position: position.trim(),
        company: company.trim(),
        platform: platform.trim(),
        job_url: jobUrl.trim(),
        notes: city.trim(),
        resume_data: resumeData,
      });
      onOpenChange(false);
    } catch {
      // stay open on error
    } finally {
      setIsSubmitting(false);
    }
  }, [position, company, platform, jobUrl, city, resumeData, onTrack, onOpenChange]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" onKeyDown={handleKeyDown}>
        <DialogHeader>
          <DialogTitle>Track Application</DialogTitle>
          <DialogDescription>
            Save this application to your tracker. ⌘↵ to submit.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-muted-foreground mb-1 block text-xs">
                Position
              </label>
              <Input
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                placeholder="Job title"
                className="text-sm"
              />
            </div>
            <div>
              <label className="text-muted-foreground mb-1 block text-xs">
                Company
              </label>
              <Input
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Company name"
                className="text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-muted-foreground mb-1 block text-xs">
                Platform
              </label>
              <AutocompleteInput
                value={platform}
                onChange={setPlatform}
                suggestions={platforms}
                placeholder="LinkedIn, Indeed..."
              />
            </div>
            <div>
              <label className="text-muted-foreground mb-1 block text-xs">
                City
              </label>
              <AutocompleteInput
                value={city}
                onChange={setCity}
                suggestions={cities}
                placeholder="City"
              />
            </div>
          </div>

          <div>
            <label className="text-muted-foreground mb-1 block text-xs">
              Job URL
            </label>
            <Input
              value={jobUrl}
              onChange={(e) => setJobUrl(e.target.value)}
              placeholder="https://..."
              className="text-sm"
            />
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleSubmit} disabled={isSubmitting || !position.trim()}>
            {isSubmitting ? "Tracking..." : "Track"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
