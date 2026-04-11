"use client";

import { ProfileCertificationsTab } from "@/components/profile/profile-certifications-tab";
import { useProfile } from "@/lib/profile-context";

export default function CertificationsPage() {
  const { draft, setDraft } = useProfile();
  return <ProfileCertificationsTab draft={draft} onChange={setDraft} />;
}
