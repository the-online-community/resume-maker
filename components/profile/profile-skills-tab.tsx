"use client";

import { useState } from "react";

import { Textarea } from "@/components/ui/textarea";
import type { UserProfile } from "@/lib/profile";

interface ProfileSkillsTabProps {
  draft: UserProfile;
  onChange: (profile: UserProfile) => void;
}

export function ProfileSkillsTab({ draft, onChange }: ProfileSkillsTabProps) {
  const [skillsText, setSkillsText] = useState(draft.skills.join(", "));

  const handleSkillsChange = (raw: string) => {
    setSkillsText(raw);
    const parsed = raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    onChange({ ...draft, skills: parsed });
  };

  return (
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
  );
}
