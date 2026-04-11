"use client";

import { ProfileSkillsTab } from "@/components/profile/profile-skills-tab";
import { useProfile } from "@/lib/profile-context";

export default function SkillsPage() {
  const { draft, setDraft } = useProfile();
  return <ProfileSkillsTab draft={draft} onChange={setDraft} />;
}
