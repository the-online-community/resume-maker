"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { ProfileContactTab } from "@/components/profile/profile-contact-tab";
import { ProfileEducationTab } from "@/components/profile/profile-education-tab";
import { ProfileExperienceTab } from "@/components/profile/profile-experience-tab";
import { ProfileLanguagesTab } from "@/components/profile/profile-languages-tab";
import { ProfileMeTab } from "@/components/profile/profile-me-tab";
import { ProfileProjectsTab } from "@/components/profile/profile-projects-tab";
import { ProfileResumeImport } from "@/components/profile/profile-resume-import";
import { ProfileSkillsTab } from "@/components/profile/profile-skills-tab";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUser } from "@/hooks/use-user";
import { EMPTY_PROFILE, migrateSkills, type UserProfile } from "@/lib/profile";

export default function ProfilePage() {
  const { user, loading: userLoading } = useUser();
  const [draft, setDraft] = useState<UserProfile>({ ...EMPTY_PROFILE });
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("me");

  // Redirect if not authenticated
  useEffect(() => {
    if (!userLoading && !user) {
      window.location.href = "/";
    }
  }, [user, userLoading]);

  // Load profile on mount
  useEffect(() => {
    if (!user) return;
    fetch("/api/profile")
      .then((res) => res.json())
      .then((data) => {
        if (data && !data.error) {
          setDraft({
            ...EMPTY_PROFILE,
            ...data,
            skills: migrateSkills(data.skills),
          });
        }
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [user]);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      if (!res.ok) throw new Error("Failed to save");
      toast.success("Profile saved");
    } catch {
      toast.error("Failed to save profile");
    } finally {
      setIsSaving(false);
    }
  }, [draft]);

  if (userLoading || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="border-primary size-6 animate-spin rounded-full border-2 border-t-transparent" />
      </div>
    );
  }

  if (!user) return null;

  const editTabs = [
    "contact",
    "skills",
    "experience",
    "education",
    "projects",
    "languages",
  ];
  const showSave = editTabs.includes(activeTab);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between gap-6">
        <div>
          <h1 className="text-xl font-semibold">Profile</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Your AI knowledge base — fill it in once, and every resume will be
            grounded in your real experience.
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/">Back</Link>
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full flex-wrap">
          <TabsTrigger value="me">Me</TabsTrigger>
          <TabsTrigger value="contact">Contact</TabsTrigger>
          <TabsTrigger value="skills">Skills</TabsTrigger>
          <TabsTrigger value="experience">Experience</TabsTrigger>
          <TabsTrigger value="education">Education</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="languages">Languages</TabsTrigger>
          <TabsTrigger value="import">Resume Import</TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="me">
            <ProfileMeTab draft={draft} onTabChange={setActiveTab} />
          </TabsContent>

          <TabsContent value="contact">
            <ProfileContactTab draft={draft} onChange={setDraft} />
          </TabsContent>

          <TabsContent value="skills">
            <ProfileSkillsTab draft={draft} onChange={setDraft} />
          </TabsContent>

          <TabsContent value="experience">
            <ProfileExperienceTab draft={draft} onChange={setDraft} />
          </TabsContent>

          <TabsContent value="education">
            <ProfileEducationTab draft={draft} onChange={setDraft} />
          </TabsContent>

          <TabsContent value="projects">
            <ProfileProjectsTab draft={draft} onChange={setDraft} />
          </TabsContent>

          <TabsContent value="languages">
            <ProfileLanguagesTab draft={draft} onChange={setDraft} />
          </TabsContent>

          <TabsContent value="import">
            <ProfileResumeImport draft={draft} onChange={setDraft} />
          </TabsContent>
        </div>
      </Tabs>

      {/* Save footer */}
      {showSave && (
        <div className="mt-6 flex items-center justify-between border-t pt-4">
          <button
            type="button"
            onClick={() => setDraft({ ...EMPTY_PROFILE })}
            className="text-muted-foreground hover:text-foreground cursor-pointer text-xs transition-colors"
          >
            Clear all
          </button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Profile"}
          </Button>
        </div>
      )}
    </div>
  );
}
