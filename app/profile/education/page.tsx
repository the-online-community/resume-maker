"use client";

import { ProfileEducationTab } from "@/components/profile/profile-education-tab";
import { useProfile } from "@/lib/profile-context";

export default function EducationPage() {
  const { draft, setDraft } = useProfile();
  return <ProfileEducationTab draft={draft} onChange={setDraft} />;
}
