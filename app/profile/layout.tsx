"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { AppHeader } from "@/components/app-header";
import { ModelSelector } from "@/components/model-selector";
import { OnboardingChecklist } from "@/components/profile/onboarding-checklist";
import { ResumeImportDialog } from "@/components/profile/resume-import-dialog";
import { Button } from "@/components/ui/button";
import { DEFAULT_MODEL_ID } from "@/lib/models";
import { EMPTY_PROFILE } from "@/lib/profile";
import { ProfileProvider, useProfile } from "@/lib/profile-context";

const SIDEBAR_ITEMS = [
  { href: "/profile", label: "Me" },
  { href: "/profile/contact", label: "Contact" },
  { href: "/profile/skills", label: "Skills" },
  { href: "/profile/experience", label: "Experience" },
  { href: "/profile/education", label: "Education" },
  { href: "/profile/projects", label: "Projects" },
  { href: "/profile/certifications", label: "Certifications" },
  { href: "/profile/languages", label: "Languages" },
  { href: "/profile/master-resume", label: "Master Resume" },
] as const;

// Pages that show the save footer
const SAVE_PAGES = new Set([
  "/profile/contact",
  "/profile/skills",
  "/profile/experience",
  "/profile/education",
  "/profile/projects",
  "/profile/certifications",
  "/profile/languages",
]);

function ProfileLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL_ID);

  useEffect(() => {
    const stored = localStorage.getItem("selected_model");
    if (stored) setSelectedModel(stored);
  }, []);

  const handleModelChange = (modelId: string) => {
    setSelectedModel(modelId);
    localStorage.setItem("selected_model", modelId);
  };

  const {
    draft,
    setDraft,
    isSaving,
    handleSave,
    onboardingComplete,
    handleSkipOnboarding,
    handleOnboardingComplete,
    importDialogOpen,
    setImportDialogOpen,
  } = useProfile();

  // Map pathname to tab name for onboarding checklist
  const activeTab =
    SIDEBAR_ITEMS.find((item) => item.href === pathname)
      ?.label.toLowerCase()
      .replace(" ", "-") ?? "me";

  const showSave = SAVE_PAGES.has(pathname);

  return (
    <div className="mx-auto w-full max-w-4xl px-4 pt-6 pb-12">
      <AppHeader>
        <ModelSelector
          selectedModelId={selectedModel}
          onModelChange={handleModelChange}
        />
      </AppHeader>

      {/* Page heading */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold">Profile</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Your AI knowledge base — fill it in once, and every resume will be
          grounded in your real experience.
        </p>
      </div>

      {/* Onboarding checklist — first-time users only */}
      {onboardingComplete === false && (
        <OnboardingChecklist
          draft={draft}
          activeTab={activeTab}
          onTabChange={(tab) => {
            const item = SIDEBAR_ITEMS.find(
              (i) => i.label.toLowerCase().replace(" ", "-") === tab,
            );
            if (item) window.location.href = item.href;
          }}
          onImportClick={() => setImportDialogOpen(true)}
          onSkip={handleSkipOnboarding}
          onComplete={handleOnboardingComplete}
        />
      )}

      {/* Resume import dialog */}
      <ResumeImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        draft={draft}
        onChange={setDraft}
      />

      {/* Sidebar + Content */}
      <div className="flex gap-8">
        {/* Sidebar */}
        <nav className="w-40 shrink-0">
          <ul className="space-y-0.5">
            {SIDEBAR_ITEMS.map((item) => {
              const isActive = pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`block px-3 py-2 text-sm transition-colors ${
                      isActive
                        ? "bg-accent text-foreground font-medium"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Main content */}
        <div className="min-w-0 flex-1">
          {children}

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
      </div>
    </div>
  );
}

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProfileProvider>
      <ProfileLayoutInner>{children}</ProfileLayoutInner>
    </ProfileProvider>
  );
}
