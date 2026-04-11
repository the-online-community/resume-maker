"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/user-menu";
import { useUser } from "@/hooks/use-user";

interface AppHeaderProps {
  /** Extra controls rendered before UserMenu/ThemeToggle (e.g. Clear button, Model selector) */
  children?: ReactNode;
  /** Usage stats for UserMenu — only needed on pages that track usage */
  usage?: {
    usageCount: number;
    maxAttempts: number;
    isSubscribed: boolean;
    cancelAt?: string | null;
    resetsAt?: string;
  };
}

export function AppHeader({ children, usage }: AppHeaderProps) {
  const { user } = useUser();

  return (
    <div className="mb-6 flex items-center justify-between lg:mb-8">
      <Link href="/" className="font-mono text-lg font-bold sm:text-xl">
        Resume Maker
      </Link>
      <div className="flex items-center gap-2">
        {children}
        {user && (
          <UserMenu
            user={user}
            usageCount={usage?.usageCount ?? 0}
            maxAttempts={usage?.maxAttempts ?? 5}
            isSubscribed={usage?.isSubscribed ?? false}
            cancelAt={usage?.cancelAt ?? null}
            resetsAt={usage?.resetsAt}
          />
        )}
        <ThemeToggle />
      </div>
    </div>
  );
}
