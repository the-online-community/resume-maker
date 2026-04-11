"use client";

import { ProfileMeTab } from "@/components/profile/profile-me-tab";
import { useProfile } from "@/lib/profile-context";

export default function ProfileMePage() {
  const { draft, setImportDialogOpen } = useProfile();

  return (
    <ProfileMeTab
      draft={draft}
      onTabChange={(tab) => {
        window.location.href = `/profile/${tab === "me" ? "" : tab}`;
      }}
      onImportClick={() => setImportDialogOpen(true)}
    />
  );
}
