"use client";

import { Input } from "@/components/ui/input";
import type { UserProfile } from "@/lib/profile";

interface ProfileContactTabProps {
  draft: UserProfile;
  onChange: (profile: UserProfile) => void;
}

export function ProfileContactTab({ draft, onChange }: ProfileContactTabProps) {
  const field = (
    label: string,
    key: keyof Pick<
      UserProfile,
      | "full_name"
      | "email"
      | "phone"
      | "location"
      | "linkedin"
      | "github"
      | "website"
    >,
    placeholder?: string,
  ) => (
    <div className="space-y-1">
      <label className="text-muted-foreground text-xs">{label}</label>
      <Input
        value={draft[key]}
        onChange={(e) => onChange({ ...draft, [key]: e.target.value })}
        placeholder={placeholder ?? label}
      />
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {field("Full Name", "full_name", "Jane Smith")}
        {field("Email", "email", "jane@example.com")}
        {field("Phone", "phone", "+1 (555) 000-0000")}
        {field("Location", "location", "San Francisco, CA")}
        {field("LinkedIn", "linkedin", "linkedin.com/in/username")}
        {field("GitHub", "github", "github.com/username")}
        {field("Website", "website", "yoursite.com")}
      </div>
      <p className="text-muted-foreground text-xs">
        Links are only included in the resume if they are toggled{" "}
        <span className="font-medium">on</span> in Template Settings.
      </p>
    </div>
  );
}
