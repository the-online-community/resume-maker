"use client";

import { ProfileLanguagesTab } from "@/components/profile/profile-languages-tab";
import { useProfile } from "@/lib/profile-context";

export default function LanguagesPage() {
  const { draft, setDraft } = useProfile();
  return <ProfileLanguagesTab draft={draft} onChange={setDraft} />;
}
