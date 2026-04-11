"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";

import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/user-menu";
import { useUser } from "@/hooks/use-user";

interface UsageData {
  usageCount: number;
  maxAttempts: number;
  isSubscribed: boolean;
  cancelAt?: string | null;
  resetsAt?: string;
}

interface AppHeaderProps {
  /** Extra controls rendered before UserMenu/ThemeToggle (e.g. Clear button, Model selector) */
  children?: ReactNode;
  /** Usage stats for UserMenu — if omitted, fetched automatically from /api/usage */
  usage?: UsageData;
}

export function AppHeader({ children, usage: usageProp }: AppHeaderProps) {
  const { user } = useUser();
  const [fetched, setFetched] = useState<UsageData | null>(null);

  useEffect(() => {
    // Only fetch if no usage prop was provided and we have a user
    if (usageProp || !user) return;

    fetch("/api/usage")
      .then((r) => r.json())
      .then((data) => {
        if (!data.error) {
          setFetched({
            usageCount: data.count ?? 0,
            maxAttempts: data.max ?? 5,
            isSubscribed: data.subscribed ?? false,
            cancelAt: data.cancelAt ?? null,
            resetsAt: data.resetsAt,
          });
        }
      })
      .catch(() => {});
  }, [user, usageProp]);

  const usage = usageProp ?? fetched;

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
