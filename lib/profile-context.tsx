"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";

import { useUser } from "@/hooks/use-user";
import {
  EMPTY_PROFILE,
  migrateContactFields,
  migrateSkills,
  type UserProfile,
} from "@/lib/profile";

interface ProfileContextValue {
  user: ReturnType<typeof useUser>["user"];
  draft: UserProfile;
  setDraft: React.Dispatch<React.SetStateAction<UserProfile>>;
  isSaving: boolean;
  isLoading: boolean;
  handleSave: () => Promise<void>;
  onboardingComplete: boolean | null;
  setOnboardingComplete: React.Dispatch<React.SetStateAction<boolean | null>>;
  handleSkipOnboarding: () => Promise<void>;
  handleOnboardingComplete: () => Promise<void>;
  importDialogOpen: boolean;
  setImportDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx)
    throw new Error("useProfile must be used inside <ProfileProvider>");
  return ctx;
}

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { user, loading: userLoading } = useUser();
  const [draft, setDraft] = useState<UserProfile>({ ...EMPTY_PROFILE });
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [onboardingComplete, setOnboardingComplete] = useState<boolean | null>(
    null,
  );
  const [importDialogOpen, setImportDialogOpen] = useState(false);

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
            contact_fields: migrateContactFields(data),
          });
          setOnboardingComplete(data.onboarding_complete ?? false);
        } else {
          setOnboardingComplete(false);
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

  const handleSkipOnboarding = useCallback(async () => {
    setOnboardingComplete(true);
    try {
      await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...draft, onboarding_complete: true }),
      });
    } catch {
      // silently fail — non-critical
    }
  }, [draft]);

  const handleOnboardingComplete = useCallback(async () => {
    setOnboardingComplete(true);
    try {
      await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...draft, onboarding_complete: true }),
      });
    } catch {
      // silently fail
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

  return (
    <ProfileContext.Provider
      value={{
        user,
        draft,
        setDraft,
        isSaving,
        isLoading,
        handleSave,
        onboardingComplete,
        setOnboardingComplete,
        handleSkipOnboarding,
        handleOnboardingComplete,
        importDialogOpen,
        setImportDialogOpen,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
}
