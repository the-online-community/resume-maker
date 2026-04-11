"use client";

import { ProfileExperienceTab } from "@/components/profile/profile-experience-tab";
import { useProfile } from "@/lib/profile-context";

export default function ExperiencePage() {
  const { draft, setDraft } = useProfile();
  return <ProfileExperienceTab draft={draft} onChange={setDraft} />;
}
