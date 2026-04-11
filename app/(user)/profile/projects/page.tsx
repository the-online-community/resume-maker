"use client";

import { ProfileProjectsTab } from "@/components/profile/profile-projects-tab";
import { useProfile } from "@/lib/profile-context";

export default function ProjectsPage() {
  const { draft, setDraft } = useProfile();
  return <ProfileProjectsTab draft={draft} onChange={setDraft} />;
}
