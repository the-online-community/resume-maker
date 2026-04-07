"use client";

import Link from "next/link";
import type { User } from "@supabase/supabase-js";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { createClient } from "@/lib/supabase/client";

export function UserMenu({
  user,
  usageCount,
  maxAttempts,
  isSubscribed,
  cancelAt,
}: {
  user: User;
  usageCount: number;
  maxAttempts: number;
  isSubscribed: boolean;
  cancelAt: string | null;
}) {
  const email = user.email || "";
  const fullName =
    user.user_metadata?.full_name || user.user_metadata?.name || "";
  const avatarUrl =
    user.user_metadata?.picture || user.user_metadata?.avatar_url || "";
  const initials = (fullName || email).charAt(0).toUpperCase();
  const progress = (usageCount / maxAttempts) * 100;

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.reload();
  };

  const handleManagePlan = async () => {
    const res = await fetch("/api/stripe/portal", { method: "POST" });
    const data = (await res.json()) as { url?: string };
    if (data.url) window.location.href = data.url;
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="hover:bg-muted flex cursor-pointer items-center gap-2 p-2 transition-colors"
        >
          <Avatar key={avatarUrl} className="h-7 w-7">
            <AvatarImage src={avatarUrl} alt={email} />
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
          {/* Subscription badge or usage progress */}
          <div className="hidden sm:block">
            {isSubscribed ? (
              <p className="text-[10px] font-semibold leading-none text-violet-500">
                Pro
              </p>
            ) : (
              <>
                <p className="text-muted-foreground/80 text-[10px] leading-none">
                  {usageCount}/{maxAttempts} attempts
                </p>
                <div className="bg-muted mt-1 h-1.5 w-16 overflow-hidden rounded-full">
                  <div
                    className="bg-primary h-full rounded-full transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </>
            )}
          </div>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 pt-4" align="end">
        <div className="mb-3 space-y-0.5 px-2">
          {fullName && (
            <p className="text-sm leading-none font-medium">{fullName}</p>
          )}
          <p className="text-muted-foreground text-xs">{email}</p>
        </div>
        {/* Plan details */}
        <div className="border-t px-2 py-3">
          {isSubscribed ? (
            <div className="space-y-1">
              <p className="text-xs font-medium">
                Pro Plan{" "}
                <span className="text-violet-500">· $5/mo</span>
              </p>
              {cancelAt ? (
                <p className="text-[11px] text-amber-500">
                  Cancels on{" "}
                  {new Date(cancelAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              ) : (
                <p className="text-muted-foreground text-[11px]">
                  Unlimited resume tailoring
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-1">
              <p className="text-xs font-medium">Free Plan</p>
              <p className="text-muted-foreground text-[11px]">
                {usageCount}/{maxAttempts} resumes used
              </p>
            </div>
          )}
        </div>
        {isSubscribed && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start"
            onClick={handleManagePlan}
          >
            Manage plan
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start"
          asChild
        >
          <Link href="/profile">Profile</Link>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start"
          asChild
        >
          <Link href="/applications">My Applications</Link>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-red-500 hover:bg-red-500/10 hover:text-red-500"
          onClick={handleSignOut}
        >
          Sign out
        </Button>
      </PopoverContent>
    </Popover>
  );
}
