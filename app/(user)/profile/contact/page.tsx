"use client";

import { ProfileContactTab } from "@/components/profile/profile-contact-tab";
import { useProfile } from "@/lib/profile-context";

export default function ContactPage() {
  const { draft, setDraft } = useProfile();
  return <ProfileContactTab draft={draft} onChange={setDraft} />;
}
